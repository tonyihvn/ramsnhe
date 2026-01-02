
// MUST be first! Load environment variables before importing anything that uses them
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import { initializeStartup, logStartupInfo } from './initializeSetup.js';
import { registerSuperAdminRoutes } from './superAdminRoutes.js';
import { tables } from './tablePrefix.js';


// Helper: update/insert/delete answers for a report while respecting permissions and ownership
async function upsertReportAnswers(client, reportId, payload, existingRow, req) {
    // existingRow: the ${tables.ACTIVITY_REPORTS} row for this report
    const answers = payload.answers || {};
    // load existing answers for this report
    const existRes = await client.query(`SELECT * FROM ${tables.ANSWERS} WHERE report_id = $1`, [reportId]);
    const existingRows = existRes.rows || [];
    const existingMap = {};
    const existingUsed = {};
    for (const r of existingRows) {
        const rk = `${String(r.question_id)}::${(r.answer_row_index === null || typeof r.answer_row_index === 'undefined') ? 'null' : String(r.answer_row_index)}`;
        existingMap[rk] = r;
        existingUsed[rk] = false;
    }

    const currentUserId = req.session && req.session.userId ? req.session.userId : null;
    let currentRole = 'public';
    try {
        if (currentUserId) {
            const ur = await client.query(`SELECT role FROM ${tables.USERS} WHERE id = $1 LIMIT 1`, [currentUserId]);
            if (ur.rowCount) currentRole = ur.rows[0].role || currentRole;
        }
    } catch (e) { /* ignore */ }

    // determine business id to tag answers (prefer session, fallback to existing report row)
    const answerBusinessId = (req && req.session && req.session.businessId) ? req.session.businessId : (existingRow ? existingRow.business_id : null);

    const collectQIds = [];
    for (const [qId, val] of Object.entries(answers)) {
        collectQIds.push(String(qId));
        if (Array.isArray(val)) {
            for (const row of val) {
                if (row && typeof row === 'object') {
                    for (const subQId of Object.keys(row)) collectQIds.push(String(subQId));
                }
            }
        }
    }
    const uniqueQIds = Array.from(new Set(collectQIds.map(String)));
    const qInfo = {};
    if (uniqueQIds.length) {
        try {
            const qres = await client.query(`SELECT id, page_name, section_name FROM ${tables.QUESTIONS} WHERE id = ANY($1::text[])`, [uniqueQIds]);
            for (const q of qres.rows) qInfo[String(q.id)] = { page: q.page_name || '', section: (q.section_name === undefined ? null : q.section_name) };
        } catch (e) { /* ignore */ }
    }

    const canCheck = async (pageKey, sectionKey, want) => {
        try {
            const adminRole = currentRole && String(currentRole).toLowerCase();
            if (adminRole === 'admin' || adminRole === 'super-admin' || adminRole === 'super_admin') return true;
            const permRes = await client.query(`SELECT can_create, can_edit, can_delete FROM ${tables.PAGE_PERMISSIONS} WHERE page_key = $1 AND ((section_key IS NULL AND $2 IS NULL) OR section_key = $2) AND role_name = $3 LIMIT 1`, [pageKey, sectionKey, currentRole]);
            const perm = permRes.rows && permRes.rows[0] ? permRes.rows[0] : null;
            if (!perm) return false;
            if (want === 'create') return !!perm.can_create;
            if (want === 'edit') return !!perm.can_edit;
            if (want === 'delete') return !!perm.can_delete;
            return false;
        } catch (e) { return false; }
    };

    if (answers && typeof answers === 'object') {
        for (const [qId, val] of Object.entries(answers)) {
            try {
                const pageKeyForGroup = (qInfo[String(qId)] ? qInfo[String(qId)].page : '') || '';
                const sectionKeyForGroup = (qInfo[String(qId)] ? qInfo[String(qId)].section : null) || null;

                if (Array.isArray(val)) {
                    for (let ri = 0; ri < val.length; ri++) {
                        const row = val[ri] || {};
                        if (!row || typeof row !== 'object') continue;
                        for (const [subQId, subVal] of Object.entries(row)) {
                            try {
                                let answerVal = subVal;
                                let reviewersComment = null; let qiFollowup = null; let score = null;
                                if (subVal && typeof subVal === 'object' && !(subVal instanceof Array)) {
                                    if (Object.prototype.hasOwnProperty.call(subVal, 'value')) answerVal = subVal.value;
                                    reviewersComment = subVal.reviewersComment || subVal.reviewers_comment || null;
                                    qiFollowup = subVal.qualityImprovementFollowup || subVal.quality_improvement_followup || null;
                                    score = (typeof subVal.score !== 'undefined') ? subVal.score : null;
                                }
                                const storedAnswerValue = (answerVal === null || typeof answerVal === 'undefined') ? null : (typeof answerVal === 'object' ? (Object.prototype.hasOwnProperty.call(answerVal, 'value') ? String(answerVal.value) : JSON.stringify(answerVal)) : String(answerVal));
                                const key = `${String(subQId)}::${String(ri)}`;
                                const qi = qInfo[String(subQId)] || { page: pageKeyForGroup, section: sectionKeyForGroup };
                                const pageKey = qi.page || '';
                                const sectionKey = qi.section || null;
                                if (existingMap[key]) {
                                    const rowObj = existingMap[key];
                                    const allowed = (await canCheck(pageKey, sectionKey, 'edit')) || (rowObj.recorded_by && currentUserId && Number(rowObj.recorded_by) === Number(currentUserId));
                                    if (allowed) {
                                        await client.query(`UPDATE ${tables.ANSWERS} SET answer_value=$1, reviewers_comment=$2, quality_improvement_followup=$3, score=$4, answer_datetime=$5 WHERE id = $6`, [storedAnswerValue, reviewersComment, qiFollowup, score, new Date(), rowObj.id]);
                                    }
                                    existingUsed[key] = true;
                                } else {
                                    const allowedCreate = await canCheck(pageKey, sectionKey, 'create');
                                        if (allowedCreate) {
                                        const answerGroup = `${reportId}__${String(qId).replace(/\s+/g, '_')}_${ri}`;
                                            await client.query(`INSERT INTO ${tables.ANSWERS} (report_id, activity_id, question_id, answer_value, answer_row_index, question_group, answer_group, facility_id, user_id, recorded_by, answer_datetime, reviewers_comment, quality_improvement_followup, score, business_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [reportId, payload.activityId || payload.activity_id || existingRow.activity_id, subQId, storedAnswerValue, ri, qId, answerGroup, payload.facilityId || payload.facility_id || existingRow.facility_id || null, payload.userId || payload.user_id || existingRow.user_id || null, currentUserId, new Date(), reviewersComment, qiFollowup, score, answerBusinessId]);
                                    }
                                }
                            } catch (ie) { console.error('Failed to process repeated answer during update for question', subQId, ie); }
                        }
                    }
                } else {
                    let answerVal = val; let reviewersComment = null; let qiFollowup = null; let score = null;
                    if (val && typeof val === 'object' && !(val instanceof Array)) {
                        if (Object.prototype.hasOwnProperty.call(val, 'value')) answerVal = val.value;
                        reviewersComment = val.reviewersComment || val.reviewers_comment || null;
                        qiFollowup = val.qualityImprovementFollowup || val.quality_improvement_followup || null;
                        score = (typeof val.score !== 'undefined') ? val.score : null;
                    }
                    const storedAnswerValue = (answerVal === null || typeof answerVal === 'undefined') ? null : (typeof answerVal === 'object' ? (Object.prototype.hasOwnProperty.call(answerVal, 'value') ? String(answerVal.value) : JSON.stringify(answerVal)) : String(answerVal));
                    const key = `${String(qId)}::null`;
                    const qiRow = qInfo[String(qId)] || { page: '', section: null };
                    const pageKey = qiRow.page || '';
                    const sectionKey = qiRow.section || null;
                    if (existingMap[key]) {
                        const rowObj = existingMap[key];
                        const allowed = (await canCheck(pageKey, sectionKey, 'edit')) || (rowObj.recorded_by && currentUserId && Number(rowObj.recorded_by) === Number(currentUserId));
                        if (allowed) {
                            await client.query(`UPDATE ${tables.ANSWERS} SET answer_value=$1, reviewers_comment=$2, quality_improvement_followup=$3, score=$4, answer_datetime=$5 WHERE id = $6`, [storedAnswerValue, reviewersComment, qiFollowup, score, new Date(), rowObj.id]);
                        }
                        existingUsed[key] = true;
                    } else {
                        const allowedCreate = await canCheck(pageKey, sectionKey, 'create');
                        if (allowedCreate) {
                            await client.query(`INSERT INTO ${tables.ANSWERS} (report_id, activity_id, question_id, answer_value, answer_row_index, question_group, answer_group, facility_id, user_id, recorded_by, answer_datetime, reviewers_comment, quality_improvement_followup, score, business_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [reportId, payload.activityId || payload.activity_id || existingRow.activity_id, qId, storedAnswerValue, null, null, null, payload.facilityId || payload.facility_id || existingRow.facility_id || null, payload.userId || payload.user_id || existingRow.user_id || null, currentUserId, new Date(), reviewersComment, qiFollowup, score, answerBusinessId]);
                        }
                    }
                }
            } catch (ie) { console.error('Failed to process answer during report update for question', qId, ie); }
        }
    }

    // delete stale rows if permitted
    for (const [rk, used] of Object.entries(existingUsed)) {
        if (used) continue;
        const rowObj = existingMap[rk];
        if (!rowObj) continue;
        const qid = String(rowObj.question_id);
        const qi = qInfo[qid] || { page: '', section: null };
        const pageKey = qi.page || '';
        const sectionKey = qi.section || null;
        const canDelete = await canCheck(pageKey, sectionKey, 'delete');
        const adminRole = currentRole && String(currentRole).toLowerCase();
        if (canDelete || (rowObj.recorded_by && currentUserId && Number(rowObj.recorded_by) === Number(currentUserId)) || (adminRole === 'admin' || adminRole === 'super-admin' || adminRole === 'super_admin')) {
            try { await client.query(`DELETE FROM ${tables.ANSWERS} WHERE id = $1`, [rowObj.id]); } catch (de) { console.error('Failed to delete stale answer row', rowObj.id, de); }
        }
    }
}
import cookieSession from 'cookie-session';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';

// ESM: provide __dirname/__filename helpers since Node ESM doesn't provide them by default
const __filename = typeof fileURLToPath === 'function' ? fileURLToPath(import.meta.url) : undefined;
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

const app = express();
const PORT = Number(process.env.SERVER_PORT || process.env.PORT) || 3000;
// Allow public admin-like endpoints in development or when explicitly enabled
const allowPublicAdmin = (process.env.ALLOW_PUBLIC_ADMIN === 'true') || (process.env.NODE_ENV !== 'production');

// Middleware - MUST be registered before route handlers so req.body is available
// CORS handling: allow localhost and common local network origins during development.
// In production, only allow explicitly configured hosts via `FRONTEND_HOSTS` or `FRONTEND_HOST`.
const frontendPort = process.env.FRONTEND_PORT ? Number(process.env.FRONTEND_PORT) : undefined;
app.use(cors({
    origin: (origin, callback) => {
        // If no origin (server-to-server or curl), allow
        if (!origin) return callback(null, true);
        try {
            const u = new URL(origin);
            const hostname = u.hostname;

            // Always allow localhost loopback
            if (hostname === 'localhost' || hostname === '127.0.0.1') return callback(null, origin);

            // In non-production (development/testing) allow private LAN IP ranges so
            // frontend served on an internal address (e.g., http://172.16.x.x:9090)
            // can call the backend without CORS blocking.
            if (process.env.NODE_ENV !== 'production') {
                // match 10.x.x.x, 192.168.x.x, and 172.16.0.0 - 172.31.255.255
                if (/^(10|127)\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return callback(null, origin);
                // support an explicit all-origins flag for development convenience
                if (process.env.ALLOW_ALL_ORIGINS === 'true') return callback(null, origin);
            }

            // Allow explicitly configured frontend hosts (comma-separated list) in production
            const allowedHosts = (process.env.FRONTEND_HOSTS || process.env.FRONTEND_HOST || '').split(',').map(s => s.trim()).filter(Boolean);
            if (allowedHosts.length) {
                if (allowedHosts.includes(origin) || allowedHosts.includes(hostname)) return callback(null, origin);
            }
        } catch (e) {
            /* fallthrough - deny below */
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Simple Session Setup (No Passport needed for dev mode)
app.use(
    cookieSession({
        name: 'session',
        keys: ['key1', 'key2'],
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    })
);

// Serve uploaded files (images/videos) from /uploads
const uploadsRoot = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
app.use('/uploads', express.static(uploadsRoot));

// Serve built report artifacts
const buildsRoot = path.join(process.cwd(), 'public', 'builds');
if (!fs.existsSync(buildsRoot)) fs.mkdirSync(buildsRoot, { recursive: true });
app.use('/builds', express.static(buildsRoot));

// Image upload endpoint
app.post('/api/upload-image', async (req, res) => {
    try {
        const { file, filename } = req.body;
        
        if (!file || !filename) {
            return res.status(400).json({ error: 'Missing file or filename' });
        }

        // Remove data:image/... prefix if present
        let base64Data = file;
        if (file.includes(',')) {
            base64Data = file.split(',')[1];
        }

        // Sanitize filename
        const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filepath = path.join(uploadsRoot, safeName);

        // Decode and save file
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filepath, buffer);

        // Return public URL
        const url = `/uploads/${safeName}`;
        res.json({ url, filename: safeName });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload image: ' + error.message });
    }
});


// LLM SQL generation endpoint (provider dispatch + fallback)
async function tryCallProvider(providerRow, prompt, ragContext) {
    try {
        const cfg = providerRow.config || {};
        const base = (cfg.url || process.env.OLLAMA_URL || cfg.endpoint || '').toString().replace(/\/$/, '') || 'http://localhost:11434';
        const model = providerRow.model || cfg.model || undefined;
        // Provide a strict instruction template so LLMs 'think' and then return a safe, read-only SQL
        const instruction = `INSTRUCTIONS: You are a SQL assistant.\n- First, provide a concise explanation (1-3 sentences) of how you interpreted the user's request and what you will do (label this 'Thoughts:').\n- Then, under the heading 'Action to Be Taken:', return a single read-only SELECT SQL statement only using the provided tables and columns. Wrap the SQL in a fenced block like \`\`\`sql ... \`\`\`.\n- DO NOT reference or use any tables/columns not present in the context.\n- Do not produce DML/DDL or multiple statements.\n`;
        const payload = { prompt: `${instruction}\nContext:\n${ragContext || ''}\n\nUser: ${prompt}`, model };

        const attempts = [`${base}/v1/generate`, `${base}/generate`, `${base}/llms/generate`, `${base}/llms`, base];
        for (const ep of attempts) {
            try {
                const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!r.ok) continue;
                let j = null;
                try { j = await r.json(); } catch (e) { const txt = await r.text(); j = { text: txt }; }
                let text = '';
                if (typeof j === 'string') text = j;
                else if (j.text) text = j.text;
                else if (j.output && j.output[0] && j.output[0].content) text = j.output[0].content;
                else if (j.choices && Array.isArray(j.choices) && j.choices[0]) {
                    const c = j.choices[0];
                    text = c.message?.content || c.text || JSON.stringify(c);
                } else {
                    text = JSON.stringify(j);
                }
                let sql = null;
                const fenced = text.match(/```sql\s*([\s\S]*?)```/i);
                if (fenced) sql = fenced[1].trim();
                else {
                    const sel = text.match(/(SELECT[\s\S]*)/i);
                    if (sel) sql = sel[1].trim();
                }
                return { text, sql };
            } catch (e) {
                continue;
            }
        }
        return null;
    } catch (e) {
        console.error('tryCallProvider error', e);
        return null;
    }
}

// Helper: truncate every field in sample rows to 50 characters
function truncateSampleRows(rows) {
    if (!Array.isArray(rows)) return rows;
    return rows.map(r => {
        if (!r || typeof r !== 'object') return r;
        const out = {};
        for (const k of Object.keys(r)) {
            const v = r[k];
            if (v === null || v === undefined) { out[k] = v; continue; }
            let s;
            if (typeof v === 'string') s = v;
            else {
                try { s = JSON.stringify(v); } catch (e) { s = String(v); }
            }
            if (s.length > 50) s = s.slice(0, 50);
            out[k] = s;
        }
        return out;
    });
}

/**
 * Intelligent schema selector using semantic similarity and domain-specific heuristics
 * Analyzes prompt text to intelligently select the most relevant RAG schemas
 * Scoring factors:
 * 1. Semantic similarity (prompt keywords in schema names, descriptions, business rules)
 * 2. Domain-specific pattern matching (query intent analysis)
 * 3. Relationship inference (join hints from explicit mentions)
 * 4. Compulsory schema prioritization
 */
async function selectOptimalSchemas(prompt, ragRows) {
    try {
        // Always include compulsory schemas
        let compulsoryRags = (ragRows || []).filter(rr => String(rr.category || '').toLowerCase() === 'compulsory');
        if (!compulsoryRags || compulsoryRags.length === 0) {
            const coreNames = [tables.ACTIVITY_REPORTS, tables.ANSWERS, tables.QUESTIONS];
            compulsoryRags = ragRows.filter(rr => coreNames.includes(((rr.table_name || '')).toString()));
        }

        const lowerPrompt = String(prompt).toLowerCase();
        const tokens = (lowerPrompt.match(/\w+/g) || []).filter(t => t.length > 2); // Filter out common 2-letter words

        // Detect query intent/domain from prompt
        const queryIntent = {
            isScoreQuery: /\b(total|overall|score|sum|average|avg|mean|count|highest|lowest|best|worst)\b/.test(lowerPrompt),
            isProgramQuery: /\b(program|project|campaign|initiative)\b/.test(lowerPrompt),
            isActivityQuery: /\b(activity|activities|session|session|task|exercise|event)\b/.test(lowerPrompt),
            isUserQuery: /\b(user|users|admin|staff|team|person|people|participant|respondent)\b/.test(lowerPrompt),
            isFacilityQuery: /\b(facility|facilities|location|site|centre|center)\b/.test(lowerPrompt),
            isReportQuery: /\b(report|reports|analytics|analysis|dashboard|metric|metrics)\b/.test(lowerPrompt),
            isAnswerQuery: /\b(answer|answers|response|responses|question|questions|feedback)\b/.test(lowerPrompt),
            isComparisonQuery: /\b(compare|comparison|vs|versus|difference|similar|like|between|across)\b/.test(lowerPrompt),
            isTimeSeriesQuery: /\b(over time|trend|timeline|year|month|week|day|date|when|before|after)\b/.test(lowerPrompt),
            isAggregationQuery: /\b(by|group by|grouped|per|each|breakdown|distributed)\b/.test(lowerPrompt),
        };

        // Score each schema based on multiple factors
        const scored = ragRows.map(r => {
            const table = (r.table_name || '').toString().toLowerCase();
            const summary = (r.summary_text || '').toString().toLowerCase();
            const businessRules = (r.business_rules || '').toString().toLowerCase();
            const cols = (r.schema || []).map(c => (c.column_name || c.name || '').toString().toLowerCase());
            const colStr = cols.join(' ');

            let score = 0;
            let matchedTokens = 0;

            // ===== SEMANTIC TOKEN MATCHING =====
            // Exact and fuzzy token matches in table name, summary, business rules
            for (const t of tokens) {
                if (!t || t.length < 2) continue;

                // Table name matching (highest priority)
                if (table === t) { score += 25; matchedTokens++; }
                else if (table.includes(t)) { score += 15; matchedTokens++; }

                // Column name matching
                for (const c of cols) {
                    if (c === t) { score += 8; matchedTokens++; }
                    else if (c.includes(t) || t.includes(c.substring(0, Math.floor(c.length * 0.7)))) { score += 3; }
                }

                // Summary matching (description of what table contains)
                if (summary && summary.includes(t)) { score += 6; }

                // Business rules matching
                if (businessRules && businessRules.includes(t)) { score += 5; }
            }

            // ===== DOMAIN-SPECIFIC INTENT MATCHING =====
            // Boost schemas based on detected query intent
            if (queryIntent.isScoreQuery) {
                if (cols.some(c => c.includes('score'))) { score += 80; }
                if (cols.some(c => c.includes('overall'))) { score += 60; }
                if (cols.some(c => c.includes('answer'))) { score += 40; }
                if (table.includes('answer') || table.includes('report')) { score += 35; }
            }

            if (queryIntent.isProgramQuery) {
                if (table.includes('program') || table.includes('project')) { score += 70; }
                if (cols.some(c => c.includes('program'))) { score += 40; }
            }

            if (queryIntent.isActivityQuery) {
                if (table.includes('activity') || table.includes('session') || table.includes('task')) { score += 70; }
                if (cols.some(c => c.includes('activity'))) { score += 40; }
            }

            if (queryIntent.isUserQuery) {
                if (table.includes('user') || table.includes('staff') || table.includes('admin') || table.includes('team')) { score += 65; }
            }

            if (queryIntent.isFacilityQuery) {
                if (table.includes('facility') || table.includes('location') || table.includes('site')) { score += 65; }
            }

            if (queryIntent.isReportQuery) {
                if (table.includes('report') || table.includes('answer') || table.includes('activity')) { score += 50; }
                if (cols.some(c => c.includes('metric') || c.includes('total'))) { score += 30; }
            }

            if (queryIntent.isAnswerQuery) {
                if (table.includes('answer') || table.includes('question') || table.includes('response')) { score += 70; }
                if (cols.some(c => c.includes('answer') || c.includes('response'))) { score += 40; }
            }

            if (queryIntent.isAggregationQuery) {
                if (cols.some(c => c.includes('count') || c.includes('total') || c.includes('sum') || c.includes('average'))) { score += 40; }
            }

            // ===== RELATIONSHIP INFERENCE =====
            // Boost tables likely needed for joins based on explicit mentions
            if (lowerPrompt.includes('by') || lowerPrompt.includes('group')) {
                if (table.includes('user') || table.includes('program') || table.includes('facility')) { score += 20; }
            }

            // ===== COMPULSORY BOOST =====
            if (compulsoryRags.some(cr => cr.table_name === r.table_name)) {
                score += 30; // Ensure compulsory tables are always included but allow better matches to rank higher
            }

            return {
                r,
                score,
                matchedTokens,
                intent: queryIntent
            };
        });

        // Sort by score, then by matched tokens
        scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.matchedTokens - a.matchedTokens;
        });

        // Select top schemas with diversity
        const selected = [];
        const selectedTableNames = new Set();

        // Always include compulsory schemas
        for (const item of scored) {
            if (compulsoryRags.some(cr => cr.table_name === item.r.table_name)) {
                selected.push(item.r);
                selectedTableNames.add(item.r.table_name);
            }
        }

        // Add highest scoring non-compulsory schemas (up to 4 total, max 3 additional)
        for (const item of scored) {
            if (selected.length >= 4) break;
            if (!selectedTableNames.has(item.r.table_name) && item.score > 5) {
                selected.push(item.r);
                selectedTableNames.add(item.r.table_name);
            }
        }

        // If nothing was selected, pick the top scorers
        if (selected.length === 0) {
            for (const item of scored.slice(0, 3)) {
                if (!selectedTableNames.has(item.r.table_name)) {
                    selected.push(item.r);
                    selectedTableNames.add(item.r.table_name);
                }
            }
        }

        console.log(`[Schema Selection] Prompt: "${prompt.substring(0, 80)}..."`);
        console.log(`[Schema Selection] Intent: ${JSON.stringify(queryIntent)}`);
        console.log(`[Schema Selection] Selected: ${selected.map(s => s.table_name).join(', ')}`);
        console.log(`[Schema Selection] Top scores: ${scored.slice(0, 5).map(s => `${s.r.table_name}:${s.score}`).join(', ')}`);

        return {
            best: scored[0]?.r,
            selected: selected.length > 0 ? selected : [scored[0]?.r].filter(Boolean),
            compulsory: compulsoryRags,
            scores: scored.slice(0, 10).map(s => ({ table: s.r.table_name, score: s.score, intent: s.intent }))
        };
    } catch (e) {
        console.error('selectOptimalSchemas error:', e);
        // Fallback: return first schema and all compulsory
        const compulsoryRags = (ragRows || []).filter(rr => String(rr.category || '').toLowerCase() === 'compulsory');
        return {
            best: ragRows[0],
            selected: ragRows.slice(0, 1),
            compulsory: compulsoryRags,
            scores: []
        };
    }
}

app.post('/api/llm/generate_sql', async (req, res) => {
    try {
        const { prompt, context, scope, providerId, messages, overrideNote } = req.body || {};
        if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
        // Combine prior conversation messages (if any) with the current prompt to provide memory/context
        let combinedPrompt = String(prompt);
        try {
            if (Array.isArray(messages) && messages.length) {
                const hist = messages.map(m => `${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System'}: ${m.text}`).join('\n');
                combinedPrompt = hist + '\nUser: ' + combinedPrompt;
            }
        } catch (e) { /* ignore */ }

        const rres = await pool.query(`SELECT * FROM ${tables.RAG_SCHEMAS}`);
        const ragRows = rres.rows || [];

        // Use intelligent schema selector
        const schemaSelection = await selectOptimalSchemas(combinedPrompt, ragRows);
        const best = schemaSelection.best;
        const selectedSchemas = schemaSelection.selected;
        const compulsoryRags = schemaSelection.compulsory;

        if (!best || !selectedSchemas || selectedSchemas.length === 0) {
            const available = ragRows.map(rr => rr.table_name).filter(Boolean).slice(0, 50);
            return res.json({
                text: `I couldn't confidently match your request to any table schema. Please clarify which table/fields you mean. Available tables: ${available.join(', ')}`,
                selectedSchemas: [],
                selectedBusinessRules: []
            });
        }

        // Choose the primary table to use
        let tableName = best.table_name;
        const chosenRow = selectedSchemas.find(rr => (rr.table_name || '') === tableName) || best;

        // Re-extract tokens for column matching
        const tokens = (String(combinedPrompt).toLowerCase().match(/\w+/g) || []);
        const matchedCols = [];
        for (const c of (chosenRow.schema || [])) {
            const cname = (c.column_name || c.name || '').toString();
            const low = cname.toLowerCase();
            if (tokens.some(t => low.includes(t) || t === low)) matchedCols.push(cname);
        }

        // Include any RAG records marked as 'Compulsory' into the LLM context so the model always sees them
        // compulsoryRags already obtained from selectOptimalSchemas
        let compulsoryContext = '';
        if (compulsoryRags && compulsoryRags.length) {
            // Prefer using a short human-readable summary if available
            compulsoryContext = compulsoryRags.map(cr => {
                if (cr.summary_text && String(cr.summary_text).trim()) return `RAG Summary: ${String(cr.summary_text).trim()}${cr.business_rules ? '\nBusiness Rules: ' + cr.business_rules : ''}`;
                const crCols = (cr.schema || []).map(c => (c.column_name || c.name)).filter(Boolean).join(', ');
                const crSample = JSON.stringify((cr.sample_rows || []).slice(0, 2));
                const br = cr.business_rules ? `Business Rules: ${cr.business_rules}` : '';
                return `RAG Table: ${cr.table_name}\nColumns: ${crCols}\nSample: ${crSample}${br ? '\n' + br : ''}`;
            }).join('\n\n');
        }

        // Build structured RAG context as JSON to send to LLMs (reduces token waste and keeps schema precise)
        const buildRagObj = (row) => ({
            table_name: row.table_name,
            schema: Array.isArray(row.schema) ? row.schema.map(c => ({ data_type: c.data_type || '', column_name: c.column_name || c.name || '', is_nullable: c.is_nullable || (c.nullable ? 'YES' : 'NO') })) : [],
            sample_rows: Array.isArray(row.sample_rows) ? (row.sample_rows || []).slice(0, 3) : [],
            category: row.category || null,
            business_rules: row.business_rules || null,
            summary_text: row.summary_text || null
        });

        const chosenObj = buildRagObj(chosenRow);
        const compulsoryObjs = (compulsoryRags || []).map(buildRagObj);
        const ragContextObj = { compulsory: compulsoryObjs, chosen: chosenObj };
        const ragContext = JSON.stringify(ragContextObj);

        let providerUsed = null;
        let providerResponse = null;
        try {
            // Build enriched prompt that includes RAG context and enforces "Thinking:" output
            const enrichedPrompt = `You are a SQL query assistant with access to the following database schemas and business rules.

RAG SCHEMAS AND CONTEXT:
${ragContext}

INSTRUCTIONS:
1. First, output "Thinking:" on its own line and think step-by-step about:
   - Which table(s) from the RAG schemas are most relevant to the user's request
   - What columns should be selected and any WHERE/GROUP BY/JOIN logic needed
   - Business rules that apply to this query
2. Then output "Action to Be Taken:" on its own line and provide:
   - A single read-only SELECT SQL statement (NO INSERT/UPDATE/DELETE)
   - SQL MUST use only tables and columns present in the RAG schemas above
   - Use column names and table names exactly as shown in the schema
   - Wrap all identifiers in double quotes for safety
3. Format your response clearly with those two sections separated by newlines.

USER REQUEST:
${combinedPrompt}

Remember: Always output "Thinking:" first, then "Action to Be Taken:". Use ONLY the schemas provided above.`;

            if (providerId) {
                const pr = await pool.query(`SELECT * FROM ${tables.LLM_PROVIDERS} WHERE id = $1`, [providerId]);
                if (pr.rows.length) {
                    const prov = pr.rows[0];
                    providerResponse = await tryCallProvider(prov, enrichedPrompt, ragContext);
                    if (providerResponse) providerUsed = prov.name || prov.provider_id;
                }
            } else {
                const pres = await pool.query(`SELECT * FROM ${tables.LLM_PROVIDERS} ORDER BY priority ASC NULLS LAST`);
                for (const prov of pres.rows) {
                    try {
                        const r = await tryCallProvider(prov, enrichedPrompt, ragContext);
                        if (r) { providerResponse = r; providerUsed = prov.name || prov.provider_id; break; }
                    } catch (e) { }
                }
            }
        } catch (e) { console.error('provider dispatch error', e); }

        if (providerResponse && (providerResponse.sql || providerResponse.text)) {
            const text = providerResponse.text || '';
            const sql = providerResponse.sql || '';
            // Parse thinking and action from response if present
            let thinking = '';
            let actionText = text;
            try {
                const thinkMatch = text.match(/Thinking:([\s\S]*?)(?:Action to Be Taken:|$)/i);
                const actionMatch = text.match(/Action to Be Taken:([\s\S]*?)$/i);
                if (thinkMatch && thinkMatch[1]) thinking = thinkMatch[1].trim();
                if (actionMatch && actionMatch[1]) actionText = actionMatch[1].trim();
            } catch (e) { /* ignore parse errors */ }

            // Basic validation: ensure SQL references only tables/columns present in RAG context for safety
            try {
                const allowedTables = (ragRows || []).map(r => (r.table_name || '').toString().toLowerCase()).filter(Boolean);
                const allowedCols = new Set(((chosenRow.schema || []).map(c => (c.column_name || c.name || '').toString())));
                const referencedTables = Array.from(new Set((sql.match(/from\s+"?([a-zA-Z0-9_\.]+)"?/gi) || []).map(s => s.replace(/from\s+/i, '').replace(/"/g, '').trim().toLowerCase())));
                const badTable = referencedTables.find(t => !allowedTables.includes(t) && !t.includes('.'));
                if (badTable) {
                    return res.json({ text: `The generated SQL references table "${badTable}" which is not present in the available RAG schemas. I will not return SQL that references unknown tables. Please clarify which table you mean or pick one of: ${allowedTables.join(', ')}` });
                }
                // Check columns simply by scanning quoted identifiers and bare words in SELECT clause
                const colMatches = (sql.match(/select[\s\S]*?from/i) || [])[0] || '';
                const quotedCols = Array.from(new Set((colMatches.match(/"([a-zA-Z0-9_]+)"/g) || []).map(s => s.replace(/"/g, ''))));
                const badCol = quotedCols.find(c => !allowedCols.has(c));
                if (badCol) {
                    return res.json({ text: `The generated SQL references column "${badCol}" which is not present in the selected table schema. I will not return SQL that references unknown columns. Please clarify which columns you want.` });
                }
            } catch (e) { /* if validation fails, fall back to sending generated SQL */ }

            return res.json({
                text: actionText,
                thinking,
                sql,
                ragTables: [tableName],
                matchedColumns: matchedCols,
                providerUsed,
                selectedSchemas: selectedSchemas.map(s => s.table_name),
                selectedBusinessRules: selectedSchemas.filter(s => s.business_rules).map(s => ({ table: s.table_name, rules: s.business_rules }))
            });
        }

        const lower = String(prompt).toLowerCase();
        let sql = '';
        const numericCol = (best.schema || []).find(c => /(int|numeric|decimal|real|double|smallint|bigint)/i.test(String(c.data_type || '')));

        // A: average / mean requests
        if (/(average|avg|mean)/.test(lower) && numericCol) {
            const agg = `AVG("${numericCol.column_name}") as avg_${numericCol.column_name}`;
            const byMatch = prompt.match(/by\s+([a-zA-Z0-9_]+)/i);
            if (byMatch) {
                const groupCol = byMatch[1];
                sql = `SELECT ${agg}, "${groupCol}" FROM "${tableName}" GROUP BY "${groupCol}" LIMIT 200`;
            } else {
                sql = `SELECT ${agg} FROM "${tableName}" LIMIT 200`;
            }

            // B: count / how many requests — improved handling for "by", "per", and quoted values
        } else if (/(count|how many|number of)/.test(lower)) {
            // prefer explicit "by <col>" or "per <col>"
            const byMatch = prompt.match(/(?:by|per|group by)\s+([a-zA-Z0-9_]+)/i);
            if (byMatch) {
                const groupCol = byMatch[1];
                sql = `SELECT "${groupCol}", COUNT(*) as count FROM "${tableName}" GROUP BY "${groupCol}" LIMIT 200`;
            } else {
                // if the prompt contains a quoted value or "for <value>", try to add a WHERE clause on a text column
                const whereMatch = prompt.match(/where\s+([a-zA-Z0-9_]+)\s*(=|is|:)\s*['"]?([^'"\n]+)['"]?/i) || prompt.match(/for\s+'?([^']+)'?/i);
                if (whereMatch && whereMatch[1] && whereMatch[2]) {
                    // pattern matched as where <col> = <val>
                    const col = whereMatch[1]; const val = whereMatch[2];
                    const hasCol = (best.schema || []).some(c => (c.column_name || c.name || '') === col);
                    if (hasCol) {
                        sql = `SELECT COUNT(*) as count FROM "${tableName}" WHERE "${col}" = '${String(val).replace(/'/g, "''")}'`;
                    }
                }

                // fallback: simple count of rows
                if (!sql) sql = `SELECT COUNT(*) as count FROM "${tableName}"`;
            }

            // C: generic select with heuristic WHERE handling
        } else {
            let selectCols = [];
            if (matchedCols.length > 0) selectCols = matchedCols.slice(0, 10);
            else selectCols = (best.schema || []).map(c => (c.column_name || c.name)).filter(Boolean).slice(0, 10);
            const selectClause = (selectCols.length > 0) ? selectCols.map(c => `"${c}"`).join(', ') : '*';
            let where = '';

            // try to capture explicit where clauses including quoted values with spaces
            const whereMatch = prompt.match(/where\s+([a-zA-Z0-9_]+)\s*(=|is|:)\s*['"]?([^'"\n]+)['"]?/i);
            if (whereMatch) {
                const col = whereMatch[1]; const val = whereMatch[3];
                const hasCol = (best.schema || []).some(c => (c.column_name || c.name || '') === col);
                if (hasCol) where = ` WHERE "${col}" = '${String(val).replace(/'/g, "''")}'`;
            } else {
                // try "for <value>" or "in <value>" and match to a text column
                const forMatch = prompt.match(/(?:for|in)\s+['"]?([^'"\n]+)['"]?/i);
                if (forMatch) {
                    const val = forMatch[1].trim();
                    const textCol = (best.schema || []).find(c => /(char|text|varchar)/i.test(String(c.data_type || '')));
                    if (textCol) where = ` WHERE "${textCol.column_name || textCol.name}" ILIKE '%${String(val).replace(/'/g, "''")}%'`;
                }
            }

            // If the prompt mentions "program" and we have other RAGs with program in their table name,
            // hint a join by selecting important columns and adding a where clause if a program value was provided.
            if (!where && /program\b/.test(lower) && (ragRows || []).some(rr => (rr.table_name || '').toLowerCase().includes('program'))) {
                const programTable = (ragRows || []).find(rr => (rr.table_name || '').toLowerCase().includes('program'));
                if (programTable) {
                    // try to find a likely program name column in the program table
                    const progSchema = programTable.schema || [];
                    const progNameCol = (progSchema.find(c => /(name|title|program)/i.test(String(c.column_name || c.name || ''))) || {}).column_name || (progSchema.find(c => /(name|title|program)/i.test(String(c.column_name || c.name || ''))) || {}).name;
                    const textCol = (best.schema || []).find(c => /(char|text|varchar)/i.test(String(c.data_type || '')));
                    if (progNameCol && textCol) {
                        // if user provided a program name, capture it
                        const progMatch = prompt.match(/(?:for|in)\s+['"]?([^'"\n]+)['"]?/i);
                        if (progMatch) {
                            const progVal = progMatch[1].trim();
                            where = ` WHERE "${textCol.column_name || textCol.name}" ILIKE '%${String(progVal).replace(/'/g, "''")}%'`;
                            sql = `SELECT ${selectClause} FROM "${tableName}"${where} LIMIT 500`;
                        }
                    }
                }
            }

            if (!sql) sql = `SELECT ${selectClause} FROM "${tableName}"${where} LIMIT 500`;
        }

        // Add autogenerated business-rule guidance when relevant and include any stored business_rules
        let businessRule = '';
        try {
            if ((ragRows || []).some(rr => (rr.table_name || '').toString().toLowerCase().includes('program'))) {
                businessRule = `Business rule (autogenerated): Use the table that contains program records (e.g. any table with 'program' in its name) for organization-level program counts.`;
            }
        } catch (e) { }
        // Append explicit business rules from the chosen RAG and any compulsory RAGs
        try {
            if (chosenRow && chosenRow.business_rules) businessRule = (businessRule ? businessRule + '\n' : '') + `Business Rules (from selected RAG): ${chosenRow.business_rules}`;
            if (compulsoryRags.length) {
                const crules = compulsoryRags.map(cr => cr.business_rules).filter(Boolean);
                if (crules.length) businessRule = (businessRule ? businessRule + '\n' : '') + `Business Rules (compulsory RAGs):\n- ${crules.join('\n- ')}`;
            }
        } catch (e) { console.error('business_rules append error', e); }

        const explanation = `${overrideNote ? overrideNote + '\n' : ''}I selected the RAG schema for table "${tableName}" as the best match based on your prompt. Matched columns: ${matchedCols.join(', ') || '(none)'}.\nI will produce a safe, read-only SQL query constrained to the discovered table schema and return results formatted per your request.${businessRule ? '\n' + businessRule : ''}`;

        // Put Action on its own line and bold the SQL for clearer UI rendering
        const responseText = `${explanation}\n\nAction to Be Taken:\n**${sql}**`;
        return res.json({
            text: responseText,
            sql,
            ragTables: [tableName],
            matchedColumns: matchedCols,
            providerUsed,
            selectedSchemas: selectedSchemas.map(s => s.table_name),
            selectedBusinessRules: selectedSchemas.filter(s => s.business_rules).map(s => ({ table: s.table_name, rules: s.business_rules }))
        });

    } catch (e) {
        console.error('LLM/generate_sql error', e);
        res.status(500).json({ error: 'Failed to generate SQL', details: String(e) });
    }
});

// Execute safe read-only SQL against the configured target DB (uses process.env DB_* settings)
app.post('/api/execute_sql', async (req, res) => {
    try {
        const { sql } = req.body || {};
        if (!sql) return res.status(400).json({ error: 'Missing sql' });
        // Enforce read-only single-statement SELECT queries for safety
        const trimmed = sql.trim();
        if (!/^select\s+/i.test(trimmed)) return res.status(400).json({ error: 'Only SELECT queries are allowed' });
        if (/;/.test(trimmed.replace(/\s+/g, ' ')) && !/;\s*\z/.test(trimmed)) {
            // multiple statements detected (naive check)
            return res.status(400).json({ error: 'Multiple statements are not allowed' });
        }

        const targetConfig = {
            user: process.env.DB_USER || process.env.TARGET_DB_USER,
            host: process.env.DB_HOST || process.env.TARGET_DB_HOST,
            database: process.env.DB_NAME || process.env.TARGET_DB_NAME,
            password: process.env.DB_PASSWORD || process.env.TARGET_DB_PASSWORD,
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
            connectionTimeoutMillis: 10000
        };

        const targetPool = new Pool(targetConfig);
        try {
            const result = await targetPool.query(trimmed);
            await targetPool.end();
            return res.json({ rows: result.rows, rowCount: result.rowCount });
        } catch (e) {
            await targetPool.end().catch(() => { });
            console.error('execute_sql query error', e);
            return res.status(500).json({ error: String(e.message || e) });
        }
    } catch (e) {
        console.error('execute_sql error', e);
        res.status(500).json({ error: String(e) });
    }
});

// Simple report build endpoint: render provided HTML to PDF (via puppeteer) and return public URL
app.post('/api/build_report', async (req, res) => {
    try {
        const { html, format = 'pdf', filename = 'report', paperSize = 'A4', orientation = 'portrait' } = req.body || {};
        if (!html) return res.status(400).json({ error: 'Missing html in request' });

        const fmt = String((format || 'pdf')).toLowerCase();
        const safeName = String(filename).replace(/[^a-z0-9_\-]/gi, '_') || 'report';

        // wrapper to ensure valid HTML
        // If context provided, perform server-side substitution for placeholders (safe fallback)
        const substituteHtml = (rawHtml, ctx) => {
            try {
                let out = String(rawHtml || '');
                const qMap = {};
                const answersMap = {};
                const uploaded = Array.isArray((ctx || {}).uploadedDocs) ? (ctx || {}).uploadedDocs : [];
                if (Array.isArray((ctx || {}).questionsList)) {
                    for (const q of (ctx || {}).questionsList) {
                        try { if (q && q.id !== undefined) qMap[String(q.id)] = q; if (q && q.qid !== undefined) qMap[String(q.qid)] = q; if (q && q.question_id !== undefined) qMap[String(q.question_id)] = q; } catch (e) { }
                    }
                }
                if (Array.isArray((ctx || {}).answersList)) {
                    for (const a of (ctx || {}).answersList) {
                        try { const qid = String(a.question_id || a.questionId || a.qid || ''); if (!qid) continue; if (!answersMap[qid]) { const val = (typeof a.answer_value === 'object') ? JSON.stringify(a.answer_value) : String(a.answer_value || ''); answersMap[qid] = val; } } catch (e) { }
                    }
                }
                const escapeHtml = s => { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
                out = out.replace(/\{\{question_(\w+)\}\}/gi, (m, qid) => { const ansRaw = answersMap[String(qid)] || ''; const ans = (ansRaw === null || ansRaw === undefined) ? '' : String(ansRaw); return `<div class="report-filled">${escapeHtml(ans)}</div>`; });
                out = out.replace(/\{\{activity_([a-zA-Z0-9_]+)\}\}/gi, (m, field) => { try { const act = (ctx || {}).activityData || {}; const val = act ? (act[field] ?? act[field.toLowerCase()] ?? '') : ''; return escapeHtml(val); } catch (e) { return ''; } });
                out = out.replace(/<span[^>]*data-qid=["']?(\w+)["']?[^>]*>([\s\S]*?)<\/span>/gi, (m, qid) => { const ansRaw = answersMap[String(qid)] || ''; const ans = (ansRaw === null || ansRaw === undefined) ? '' : String(ansRaw); return `<div class="report-filled">${escapeHtml(ans)}</div>`; });
                out = out.replace(/<div[^>]*data-upload-id=["']?(\d+)["']?[^>]*>[\s\S]*?<\/div>/gi, (m, id) => {
                    try {
                        const doc = uploaded.find(d => String(d.id) === String(id));
                        if (!doc) return `<div>Uploaded table ${escapeHtml(id)} not found</div>`;
                        const rows = Array.isArray(doc.file_content) ? doc.file_content : (Array.isArray(doc.dataset_data) ? doc.dataset_data : []);
                        if (!rows || rows.length === 0) return '<div>No table data</div>';
                        const keys = Object.keys(rows[0] || {});
                        let htmlTbl = '<div class="uploaded-table-wrapper"><table style="border-collapse: collapse; width:100%;"><thead><tr>';
                        for (const k of keys) htmlTbl += `<th style="border:1px solid #ddd;padding:6px;background:#f7f7f7;text-align:left">${escapeHtml(k)}</th>`;
                        htmlTbl += '</tr></thead><tbody>';
                        for (const r of rows) { htmlTbl += '<tr>'; for (const k of keys) { const val = r && typeof r === 'object' && (r[k] !== undefined && r[k] !== null) ? String(r[k]) : ''; htmlTbl += `<td style="border:1px solid #ddd;padding:6px">${escapeHtml(val)}</td>`; } htmlTbl += '</tr>'; }
                        htmlTbl += '</tbody></table></div>';
                        return htmlTbl;
                    } catch (e) { return `<div>Failed to render uploaded table ${id}</div>`; }
                });
                return out;
            } catch (e) { return rawHtml || ''; }
        };

        const filled = (req.body && req.body.context) ? substituteHtml(html, req.body.context) : html;

        // Format-specific HTML preprocessing
        const preprocessHtml = (htmlStr, format) => {
            let out = String(htmlStr || '');

            // Remove any editor-only guide lines so they never appear in final output
            // matches elements with class 'editor-guide-line' and removes them
            try {
                out = out.replace(/<[^>]*class=["'][^"'>]*editor-guide-line[^"'>]*["'][^>]*>[\s\S]*?<\/[a-zA-Z0-9]+>/gi, '');
                out = out.replace(/<[^>]*class=["'][^"'>]*editor-guide-line[^"'>]*["'][^>]*\/>/gi, '');
            } catch (e) { /* ignore */ }

            // Remove editor-only resize handles and visual overlays that might have been
            // inadvertently saved into template HTML. These are small absolutely-positioned
            // divs added by the canvas for resizing (cursor:*resize*) and selection borders.
            try {
                // remove inner handle elements inside tpl-blocks (match common resize cursor styles)
                out = out.replace(/(<div[^>]*class=["']?tpl-block["']?[^>]*>)([\s\S]*?)(<\/div>)/gi, (m, open, inner, close) => {
                    try {
                        // strip child elements that have resize cursors
                        const cleanedInner = inner.replace(/<div[^>]*style=["'][^"']*cursor:\s*(?:se-resize|sw-resize|ne-resize|nw-resize|e-resize|w-resize|n-resize|s-resize|ew-resize|ns-resize)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
                        // remove any inline editor-only borders/handles that may have been added to the block content
                        const cleanedInner2 = cleanedInner.replace(/<div[^>]*data-?editor-?handle[^>]*>[\s\S]*?<\/div>/gi, '');
                        return `${open}${cleanedInner2}${close}`;
                    } catch (e) { return m; }
                });

                // remove border/box-shadow/padding/background inline styles on tpl-block wrappers
                out = out.replace(/(<div[^>]*class=["']?tpl-block["']?[^>]*style=["'])([^"']*)(["'][^>]*>)/gi, (m, p1, styles, p3) => {
                    try {
                        let s = String(styles || '');
                        // remove border, box-shadow, padding and other editor visual styles
                        s = s.replace(/border:[^;]+;?/gi, '');
                        s = s.replace(/box-shadow:[^;]+;?/gi, '');
                        s = s.replace(/padding:[^;]+;?/gi, '');
                        s = s.replace(/background:[^;]+;?/gi, '');
                        // collapse multiple semicolons and trim
                        s = s.replace(/;{2,}/g, ';').replace(/^;|;$/g, '').trim();
                        return `${p1}${s}${p3}`;
                    } catch (e) { return m; }
                });
            } catch (e) { /* ignore cleaning errors */ }

            // For DOCX: attempt to preserve both left/top by converting absolute positioning to
            // margin-left / margin-top so Word can approximate object placement
            if (format === 'docx') {
                out = out.replace(/<div[^>]*class=["']?tpl-block["']?[^>]*style=["']([^"']*)["'][^>]*>([\s\S]*?)<\/div>/gi, (match, style, content) => {
                    try {
                        const leftMatch = style.match(/left:\s*([0-9.]+)px/);
                        const topMatch = style.match(/top:\s*([0-9.]+)px/);
                        const leftVal = leftMatch ? Math.max(0, parseInt(leftMatch[1])) : 0;
                        const topVal = topMatch ? Math.max(0, parseInt(topMatch[1])) : 0;
                        const marginLeft = Math.max(0, leftVal - 20);
                        const marginTop = Math.max(0, topVal - 0);
                        return `<div style="margin-left:${marginLeft}px;margin-top:${marginTop}px;margin-bottom:12px;page-break-inside:avoid;">${content}</div>`;
                    } catch (e) { return `<div>${content}</div>`; }
                });
            }

            // Remove header-only marker from uploaded tables in final output
            // The marker was only for canvas preview
            out = out.replace(/\s+data-header-only="true"/gi, '');

            return out;
        };

        const filledProcessed = preprocessHtml(filled, fmt);
        const wrapperHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#fff} table{page-break-inside:auto;} tr{page-break-inside:avoid; page-break-after:auto;} </style></head><body>${filledProcessed}</body></html>`;

        // Determine if the HTML contains positioned layout blocks that require screenshot fallback
        let hasTplBlocks = false;
        try {
            const { JSDOM } = await import('jsdom');
            const domForBlocks = new JSDOM(wrapperHtml);
            hasTplBlocks = Boolean(domForBlocks.window.document.querySelector('.tpl-block'));
        } catch (e) {
            // ignore if jsdom isn't available; hasTplBlocks remains false
        }

        // Normalize image-like formats so callers may request 'png' or 'image'
        const isImageRequest = (fmt === 'image' || fmt === 'jpg' || fmt === 'jpeg' || fmt === 'png');

        if (fmt === 'pdf') {
            // render PDF using puppeteer and respect paper size/orientation
            const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            const page = await browser.newPage();
            await page.setContent(wrapperHtml, { waitUntil: 'networkidle0' });

            const outName = `${safeName}_${Date.now()}.pdf`;
            const outPath = path.join(buildsRoot, outName);
            // puppeteer supports format and landscape
            const pdfOptions = { path: outPath, printBackground: true, format: (paperSize || 'A4'), landscape: (orientation === 'landscape') };
            await page.pdf(pdfOptions);
            await browser.close();
            const publicUrl = `/builds/${outName}`;
            return res.json({ url: publicUrl, path: outPath });
        }

        if (isImageRequest) {
            // render an image (JPG) of the page using puppeteer
            try {
                const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                const page = await browser.newPage();
                await page.setContent(wrapperHtml, { waitUntil: 'networkidle0' });
                const outName = `${safeName}_${Date.now()}.${(fmt === 'png' ? 'png' : 'jpg')}`;
                const outPath = path.join(buildsRoot, outName);
                // Screenshot with quality settings for JPG/PNG output
                if (fmt === 'png') {
                    await page.screenshot({ path: outPath, fullPage: true, type: 'png' });
                } else {
                    await page.screenshot({ path: outPath, fullPage: true, type: 'jpeg', quality: 90 });
                }
                await browser.close();
                const publicUrl = `/builds/${outName}`;
                console.debug(`[build_report] image (jpg) generated: ${outName}`);
                return res.json({ url: publicUrl, path: outPath });
            } catch (e) {
                console.error('image rendering failed', e);
                return res.status(500).json({ error: 'Failed to generate image', details: String(e) });
            }
        }

        if (fmt === 'docx') {
            // If template uses positioned layout blocks, render a screenshot and embed as an image in the DOCX
            let htmlDocx;
            try { htmlDocx = await import('html-docx-js'); } catch (e) { return res.status(500).json({ error: 'Server missing dependency: html-docx-js. Run `npm install html-docx-js`' }); }
            try {
                if (hasTplBlocks) {
                    // Render screenshot and embed as base64 image in a minimal HTML so html-docx-js will include it
                    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                    const page = await browser.newPage();
                    await page.setContent(wrapperHtml, { waitUntil: 'networkidle0' });
                    const imgName = `${safeName}_${Date.now()}.jpg`;
                    const imgPath = path.join(buildsRoot, imgName);
                    await page.screenshot({ path: imgPath, fullPage: true, type: 'jpeg', quality: 90 });
                    await browser.close();

                    // read file and convert to base64
                    const imgBuf = fs.readFileSync(imgPath);
                    const b64 = imgBuf.toString('base64');
                    const imgHtml = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;}</style></head><body><img src="data:image/jpeg;base64,${b64}" style="width:100%;height:auto;display:block"/></body></html>`;
                    const docxBuffer = htmlDocx && htmlDocx.asBlob ? Buffer.from(await htmlDocx.asBlob(imgHtml).arrayBuffer()) : Buffer.from(htmlDocx.asHTML ? htmlDocx.asHTML(imgHtml) : imgHtml);
                    const outName = `${safeName}_${Date.now()}.docx`;
                    const outPath = path.join(buildsRoot, outName);
                    fs.writeFileSync(outPath, docxBuffer);
                    const publicUrl = `/builds/${outName}`;
                    return res.json({ url: publicUrl, path: outPath });
                } else {
                    // Sanitize HTML for DOCX by removing problematic elements
                    let sanitizedHtml = wrapperHtml;
                    
                    // Remove script tags and their content
                    sanitizedHtml = sanitizedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                    // Remove style tags and their content
                    sanitizedHtml = sanitizedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                    // Remove meta tags
                    sanitizedHtml = sanitizedHtml.replace(/<meta[^>]*>/gi, '');
                    // Remove link tags
                    sanitizedHtml = sanitizedHtml.replace(/<link[^>]*>/gi, '');
                    // Remove data attributes that might cause issues
                    sanitizedHtml = sanitizedHtml.replace(/\s+data-[a-z\-]+="[^"]*"/gi, '');
                    // Remove content editable attributes
                    sanitizedHtml = sanitizedHtml.replace(/\s+contenteditable="[^"]*"/gi, '');
                    // Remove gramm attributes
                    sanitizedHtml = sanitizedHtml.replace(/\s+data-gramm="[^"]*"/gi, '');
                    // Remove all event handlers (onclick, onload, etc)
                    sanitizedHtml = sanitizedHtml.replace(/\s+on[a-z]+="[^"]*"/gi, '');
                    // Remove class and id attributes that might reference external styles
                    sanitizedHtml = sanitizedHtml.replace(/\s+class="[^"]*"/gi, '');
                    // Normalize line breaks
                    sanitizedHtml = sanitizedHtml.replace(/<br\s*\/?>/g, '<br/>');
                    // Fix self-closing tags
                    sanitizedHtml = sanitizedHtml.replace(/<img([^>]*)(?<!\/)>/g, '<img$1/>');
                    sanitizedHtml = sanitizedHtml.replace(/<hr([^>]*)(?<!\/)>/g, '<hr$1/>');
                    sanitizedHtml = sanitizedHtml.replace(/<input([^>]*)(?<!\/)>/g, '<input$1/>');
                    
                    // Wrap in proper HTML document structure for better compatibility
                    if (!sanitizedHtml.toLowerCase().includes('<html')) {
                        sanitizedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${sanitizedHtml}</body></html>`;
                    }
                    
                    try {
                        let docxBuffer;
                        let convertedSuccessfully = false;
                        
                        // Try primary method: htmlDocx.asBlob
                        if (htmlDocx && htmlDocx.asBlob && !convertedSuccessfully) {
                            try {
                                const blobOrBuffer = await htmlDocx.asBlob(sanitizedHtml);
                                if (blobOrBuffer) {
                                    if (Buffer.isBuffer(blobOrBuffer)) {
                                        docxBuffer = blobOrBuffer;
                                    } else if (blobOrBuffer instanceof ArrayBuffer) {
                                        docxBuffer = Buffer.from(blobOrBuffer);
                                    } else if (blobOrBuffer instanceof Blob) {
                                        const arrayBuffer = await blobOrBuffer.arrayBuffer();
                                        docxBuffer = Buffer.from(arrayBuffer);
                                    } else if (typeof blobOrBuffer === 'string') {
                                        docxBuffer = Buffer.from(blobOrBuffer, 'binary');
                                    } else {
                                        // Try to convert to buffer as last resort
                                        docxBuffer = Buffer.from(JSON.stringify(blobOrBuffer));
                                    }
                                    convertedSuccessfully = true;
                                }
                            } catch (e) {
                                console.warn('asBlob method failed:', e.message);
                            }
                        }
                        
                        // Try secondary method: htmlDocx.default.asBlob
                        if (htmlDocx && htmlDocx.default && htmlDocx.default.asBlob && !convertedSuccessfully) {
                            try {
                                const blobOrBuffer = await htmlDocx.default.asBlob(sanitizedHtml);
                                if (blobOrBuffer) {
                                    if (Buffer.isBuffer(blobOrBuffer)) {
                                        docxBuffer = blobOrBuffer;
                                    } else if (blobOrBuffer instanceof ArrayBuffer) {
                                        docxBuffer = Buffer.from(blobOrBuffer);
                                    } else if (blobOrBuffer instanceof Blob) {
                                        const arrayBuffer = await blobOrBuffer.arrayBuffer();
                                        docxBuffer = Buffer.from(arrayBuffer);
                                    } else if (typeof blobOrBuffer === 'string') {
                                        docxBuffer = Buffer.from(blobOrBuffer, 'binary');
                                    }
                                    convertedSuccessfully = true;
                                }
                            } catch (e) {
                                console.warn('default.asBlob method failed:', e.message);
                            }
                        }
                        
                        // Try tertiary method: htmlDocx.asDocument
                        if (htmlDocx && htmlDocx.asDocument && !convertedSuccessfully) {
                            try {
                                const doc = await htmlDocx.asDocument(sanitizedHtml);
                                if (doc) {
                                    if (Buffer.isBuffer(doc)) {
                                        docxBuffer = doc;
                                    } else if (doc instanceof ArrayBuffer) {
                                        docxBuffer = Buffer.from(doc);
                                    } else if (typeof doc === 'string') {
                                        docxBuffer = Buffer.from(doc, 'binary');
                                    }
                                    convertedSuccessfully = true;
                                }
                            } catch (e) {
                                console.warn('asDocument method failed:', e.message);
                            }
                        }
                        
                        if (!convertedSuccessfully || !docxBuffer) {
                            throw new Error('All html-docx-js conversion methods failed');
                        }
                        
                        // Verify the buffer is not empty and has reasonable size
                        if (docxBuffer.length < 100) {
                            throw new Error(`Generated DOCX buffer too small (${docxBuffer.length} bytes) - likely corrupted`);
                        }
                        
                        const outName = `${safeName}_${Date.now()}.docx`;
                        const outPath = path.join(buildsRoot, outName);
                        fs.writeFileSync(outPath, docxBuffer);
                        
                        // Verify file was written correctly
                        const fileStats = fs.statSync(outPath);
                        if (fileStats.size < 100) {
                            throw new Error(`Generated DOCX file too small (${fileStats.size} bytes) - file may be corrupted`);
                        }
                        
                        const publicUrl = `/builds/${outName}`;
                        return res.json({ url: publicUrl, path: outPath });
                    } catch (e) {
                        console.error('DOCX sanitization/conversion error:', e.message, e.stack);
                        throw e;
                    }
                }
            } catch (e) {
                console.error('DOCX conversion failed with error:', e.message, '- falling back to image rendering');
                // Fallback: render as image instead of DOCX to ensure user can view content
                try {
                    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                    const page = await browser.newPage();
                    await page.setContent(wrapperHtml, { waitUntil: 'networkidle0' });
                    const imgName = `${safeName}_${Date.now()}.jpg`;
                    const imgPath = path.join(buildsRoot, imgName);
                    await page.screenshot({ path: imgPath, fullPage: true, type: 'jpeg', quality: 90 });
                    await browser.close();
                    
                    // Create a simple DOCX with the image embedded
                    const imgBuf = fs.readFileSync(imgPath);
                    const b64 = imgBuf.toString('base64');
                    const fallbackHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;"><img src="data:image/jpeg;base64,${b64}" style="width:100%;height:auto;display:block;"/></body></html>`;
                    
                    let docxBuffer;
                    let fallbackDocxGenerated = false;
                    
                    try {
                        // Try multiple methods to create DOCX with image
                        if (htmlDocx && htmlDocx.asBlob) {
                            try {
                                const blobOrBuffer = await htmlDocx.asBlob(fallbackHtml);
                                if (blobOrBuffer) {
                                    if (Buffer.isBuffer(blobOrBuffer)) {
                                        docxBuffer = blobOrBuffer;
                                    } else if (blobOrBuffer instanceof ArrayBuffer) {
                                        docxBuffer = Buffer.from(blobOrBuffer);
                                    } else if (blobOrBuffer instanceof Blob) {
                                        const arrayBuffer = await blobOrBuffer.arrayBuffer();
                                        docxBuffer = Buffer.from(arrayBuffer);
                                    } else if (typeof blobOrBuffer === 'string') {
                                        docxBuffer = Buffer.from(blobOrBuffer, 'binary');
                                    }
                                    fallbackDocxGenerated = true;
                                }
                            } catch (e) {
                                console.warn('Fallback asBlob method failed:', e.message);
                            }
                        }
                        
                        if (!fallbackDocxGenerated && htmlDocx && htmlDocx.default && htmlDocx.default.asBlob) {
                            try {
                                const blobOrBuffer = await htmlDocx.default.asBlob(fallbackHtml);
                                if (blobOrBuffer) {
                                    if (Buffer.isBuffer(blobOrBuffer)) {
                                        docxBuffer = blobOrBuffer;
                                    } else if (blobOrBuffer instanceof ArrayBuffer) {
                                        docxBuffer = Buffer.from(blobOrBuffer);
                                    } else if (blobOrBuffer instanceof Blob) {
                                        const arrayBuffer = await blobOrBuffer.arrayBuffer();
                                        docxBuffer = Buffer.from(arrayBuffer);
                                    } else if (typeof blobOrBuffer === 'string') {
                                        docxBuffer = Buffer.from(blobOrBuffer, 'binary');
                                    }
                                    fallbackDocxGenerated = true;
                                }
                            } catch (e) {
                                console.warn('Fallback default.asBlob method failed:', e.message);
                            }
                        }
                    } catch (docxErr) {
                        console.error('Failed to create DOCX with image:', docxErr.message);
                    }
                    
                    if (!fallbackDocxGenerated || !docxBuffer || docxBuffer.length < 100) {
                        console.warn('DOCX generation failed or produced invalid file, returning raw image instead');
                        // Return image path directly if DOCX creation fails
                        return res.json({ url: `/builds/${imgName}`, path: imgPath, fallback: true, message: 'Rendered as image due to DOCX compatibility issue' });
                    }
                    
                    const outName = `${safeName}_${Date.now()}.docx`;
                    const outPath = path.join(buildsRoot, outName);
                    fs.writeFileSync(outPath, docxBuffer);
                    
                    // Verify file was written correctly
                    const fileStats = fs.statSync(outPath);
                    if (fileStats.size < 100) {
                        console.error(`Generated DOCX file too small (${fileStats.size} bytes) - file may be corrupted`);
                        // Delete the bad file and return image instead
                        try { fs.unlinkSync(outPath); } catch (e) { /* ignore */ }
                        return res.json({ url: `/builds/${imgName}`, path: imgPath, fallback: true, message: 'Rendered as image due to DOCX file corruption' });
                    }
                    
                    const publicUrl = `/builds/${outName}`;
                    return res.json({ url: publicUrl, path: outPath, fallback: true, message: 'Rendered as image due to HTML compatibility issues' });
                } catch (fallbackErr) {
                    console.error('Fallback image rendering also failed:', fallbackErr);
                    return res.status(500).json({ error: 'Failed to generate DOCX. Could not render as fallback image either.', details: String(fallbackErr) });
                }
            }
        }

        if (fmt === 'xlsx') {
            // Attempt to convert the first HTML table into an Excel workbook using ExcelJS
            try {
                const { JSDOM } = await import('jsdom');
                const dom = new JSDOM(wrapperHtml);

                // if we have positioned blocks in the HTML (tpl-block), it's likely a visual layout report
                // In that case, render a screenshot and embed the image into a single-sheet XLSX so layout/positions are preserved visually
                const hasBlocks = Boolean(dom.window.document.querySelector('.tpl-block'));
                const workbook = new ExcelJS.Workbook();
                const sheet = workbook.addWorksheet('Sheet1');

                if (hasBlocks) {
                    // render screenshot and embed as image
                    try {
                        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                        const page = await browser.newPage();
                        await page.setContent(wrapperHtml, { waitUntil: 'networkidle0' });

                        const imgName = `${safeName}_${Date.now()}.jpg`;
                        const imgPath = path.join(buildsRoot, imgName);
                        await page.screenshot({ path: imgPath, fullPage: true, type: 'jpeg', quality: 90 });
                        await browser.close();

                        // compute sheet image size based on paper size
                        const paperMm = { A4: { w: 210, h: 297 }, Letter: { w: 216, h: 279 }, A3: { w: 297, h: 420 } };
                        const mm = paperMm[paperSize] || paperMm['A4'];
                        const physW = (orientation === 'landscape') ? mm.h : mm.w;
                        const physH = (orientation === 'landscape') ? mm.w : mm.h;
                        const pxPerMm = 96 / 25.4;
                        const widthPx = Math.round(physW * pxPerMm);
                        const heightPx = Math.round(physH * pxPerMm);

                        const imageId = workbook.addImage({ filename: imgPath, extension: 'jpeg' });
                        sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: widthPx, height: heightPx } });

                        const outName = `${safeName}_${Date.now()}.xlsx`;
                        const outPath = path.join(buildsRoot, outName);
                        await workbook.xlsx.writeFile(outPath);
                        const publicUrl = `/builds/${outName}`;
                        return res.json({ url: publicUrl, path: outPath });
                    } catch (e) {
                        console.error('xlsx (image-embed) conversion failed', e);
                        // fall back to table/text conversion below
                    }
                }

                // Fallback: convert first HTML table into Excel cells
                const table = dom.window.document.querySelector('table');
                if (table) {
                    const rows = Array.from(table.querySelectorAll('tr'));
                    for (const tr of rows) {
                        const cells = Array.from(tr.querySelectorAll('th,td')).map(c => c.textContent || '');
                        sheet.addRow(cells);
                    }
                } else {
                    // no table found - write the HTML as a single cell
                    sheet.addRow([dom.window.document.body.textContent || '']);
                }

                const outName = `${safeName}_${Date.now()}.xlsx`;
                const outPath = path.join(buildsRoot, outName);
                await workbook.xlsx.writeFile(outPath);
                const publicUrl = `/builds/${outName}`;
                return res.json({ url: publicUrl, path: outPath });
            } catch (e) {
                console.error('xlsx conversion failed', e);
                return res.status(500).json({ error: 'Failed to generate XLSX', details: String(e) });
            }
        }

        console.error(`[build_report] Unsupported format: ${fmt} (original: ${format})`);
        return res.status(400).json({ error: 'Unsupported format', providedFormat: fmt });
    } catch (e) {
        console.error('build_report failed', e);
        try { return res.status(500).json({ error: String(e) }); } catch (err) { return res.status(500).end(); }
    }
});

// ...existing middleware registered earlier

// Database Connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'dqappdb',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

// Register Super Admin Routes
registerSuperAdminRoutes(app, pool);

// Form Schemas API Endpoints (Admin only)
// POST /api/admin/form-schemas - Save or update a form schema
app.post('/api/admin/form-schemas', requireAdmin, async (req, res) => {
    try {
        const { name, formType, fields, id } = req.body;
        const businessId = req.session?.businessId || null;

        console.log('[Form Schema Save] Received:', { formType, businessId, fieldCount: Array.isArray(fields) ? fields.length : 'invalid' });

        if (!name || !formType || !Array.isArray(fields)) {
            console.log('[Form Schema Save] Validation failed:', { name, formType, fieldsIsArray: Array.isArray(fields) });
            return res.status(400).json({ error: 'Missing required fields: name, formType, fields' });
        }

        if (!['facility', 'user'].includes(formType)) {
            return res.status(400).json({ error: 'formType must be "facility" or "user"' });
        }

        const schemaId = id || `schema_${formType}_${Date.now()}`;
        const now = new Date().toISOString();

        // Check if schema already exists
        const checkRes = await pool.query(
            `SELECT id FROM ${tables.FORM_SCHEMAS} WHERE "formType" = $1 AND business_id IS NOT DISTINCT FROM $2 LIMIT 1`,
            [formType, businessId]
        );

        console.log('[Form Schema Save] Check result:', { found: checkRes.rowCount > 0 });

        if (checkRes.rowCount > 0) {
            // Update existing schema
            console.log('[Form Schema Save] Updating existing schema');
            const updateRes = await pool.query(
                `UPDATE ${tables.FORM_SCHEMAS} SET name = $1, fields = $2, "updatedAt" = $3 WHERE "formType" = $4 AND business_id IS NOT DISTINCT FROM $5 RETURNING *`,
                [name, JSON.stringify(fields), now, formType, businessId]
            );
            const row = updateRes.rows[0];
            console.log('[Form Schema Save] Update complete:', { id: row.id, fieldCount: Array.isArray(row.fields) ? row.fields.length : 'unknown' });
            return res.json({
                id: row.id,
                name: row.name,
                formType: row.formType,
                fields: Array.isArray(row.fields) ? row.fields : JSON.parse(row.fields || '[]'),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            });
        } else {
            // Insert new schema
            console.log('[Form Schema Save] Inserting new schema');
            const insertRes = await pool.query(
                `INSERT INTO ${tables.FORM_SCHEMAS} (id, name, "formType", fields, business_id, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [schemaId, name, formType, JSON.stringify(fields), businessId, now, now]
            );
            const row = insertRes.rows[0];
            console.log('[Form Schema Save] Insert complete:', { id: row.id, fieldCount: Array.isArray(row.fields) ? row.fields.length : 'unknown' });
            return res.json({
                id: row.id,
                name: row.name,
                formType: row.formType,
                fields: Array.isArray(row.fields) ? row.fields : JSON.parse(row.fields || '[]'),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            });
        }
    } catch (error) {
        console.error('[Form Schema Save] Error:', error);
        res.status(500).json({ error: 'Failed to save form schema: ' + String(error) });
    }
});

// GET /api/admin/form-schemas/:formType - Get form schema by type (Admin only)
app.get('/api/admin/form-schemas/:formType', requireAdmin, async (req, res) => {
    try {
        const { formType } = req.params;
        const businessId = req.session?.businessId || null;

        console.log('[Form Schema Load] Request:', { formType, businessId });

        if (!['facility', 'user'].includes(formType)) {
            return res.status(400).json({ error: 'formType must be "facility" or "user"' });
        }

        const dbRes = await pool.query(
            `SELECT * FROM ${tables.FORM_SCHEMAS} WHERE "formType" = $1 AND business_id IS NOT DISTINCT FROM $2 LIMIT 1`,
            [formType, businessId]
        );

        console.log('[Form Schema Load] Query result:', { found: dbRes.rowCount > 0, count: dbRes.rowCount });

        if (dbRes.rowCount === 0) {
            // Try fallback to NULL business_id (global/default schema)
            const fallbackRes = await pool.query(
                `SELECT * FROM ${tables.FORM_SCHEMAS} WHERE "formType" = $1 AND business_id IS NULL LIMIT 1`,
                [formType]
            );
            console.log('[Form Schema Load] Fallback query result:', { found: fallbackRes.rowCount > 0 });
            
            if (fallbackRes.rowCount > 0) {
                const row = fallbackRes.rows[0];
                return res.json({
                    id: row.id,
                    name: row.name,
                    formType: row.formType,
                    fields: Array.isArray(row.fields) ? row.fields : JSON.parse(row.fields || '[]'),
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                });
            }

            // Return empty schema instead of 404 for admin endpoint too
            return res.json({
                id: `default_${formType}`,
                name: `Default ${formType === 'facility' ? 'Facility' : 'User'} Form`,
                formType: formType,
                fields: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }

        const row = dbRes.rows[0];
        console.log('[Form Schema Load] Returning schema:', { id: row.id, fieldCount: Array.isArray(row.fields) ? row.fields.length : 'unknown' });
        res.json({
            id: row.id,
            name: row.name,
            formType: row.formType,
            fields: Array.isArray(row.fields) ? row.fields : JSON.parse(row.fields || '[]'),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        });
    } catch (error) {
        console.error('[Form Schema Load] Error:', error);
        res.status(500).json({ error: 'Failed to get form schema: ' + String(error) });
    }
});

// GET /api/form-schemas/:formType - Public endpoint to get form schema for any form (authenticated users)
app.get('/api/form-schemas/:formType', async (req, res) => {
    try {
        const { formType } = req.params;
        // Get business_id from session or default to null
        const businessId = req.session?.businessId || null;

        if (!['facility', 'user'].includes(formType)) {
            return res.status(400).json({ error: 'formType must be "facility" or "user"' });
        }

        // Return empty schema if no custom fields defined - this is okay for forms
        const dbRes = await pool.query(
            `SELECT * FROM ${tables.FORM_SCHEMAS} WHERE "formType" = $1 AND (business_id = $2 OR business_id IS NULL) LIMIT 1`,
            [formType, businessId]
        );

        if (dbRes.rowCount === 0) {
            // Return empty schema instead of 404
            return res.json({
                id: `default_${formType}`,
                name: `Default ${formType === 'facility' ? 'Facility' : 'User'} Form`,
                formType: formType,
                fields: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }

        const row = dbRes.rows[0];
        res.json({
            id: row.id,
            name: row.name,
            formType: row.formType,
            fields: Array.isArray(row.fields) ? row.fields : JSON.parse(row.fields || '[]'),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        });
    } catch (error) {
        console.error('Failed to get form schema:', error);
        res.status(500).json({ error: 'Failed to get form schema: ' + String(error) });
    }
});

// DELETE /api/admin/form-schemas/:formType - Delete form schema
app.delete('/api/admin/form-schemas/:formType', requireAdmin, async (req, res) => {
    try {
        const { formType } = req.params;
        const businessId = req.session?.businessId || null;

        if (!['facility', 'user'].includes(formType)) {
            return res.status(400).json({ error: 'formType must be "facility" or "user"' });
        }

        await pool.query(
            `DELETE FROM ${tables.FORM_SCHEMAS} WHERE "formType" = $1 AND business_id = $2`,
            [formType, businessId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete form schema:', error);
        res.status(500).json({ error: 'Failed to delete form schema: ' + String(error) });
    }
});

// TABLE_PREFIX can be set in the environment to create an additional set
// of tables with that prefix on startup. We do NOT rewrite runtime SQL;
// the application continues to reference the default 'dqai_' tables unless
// code is explicitly changed. Use the prefixed tables for migration or
// parallel installations when needed.
const TABLE_PREFIX = (process.env.TABLE_PREFIX || 'dqai_');

// Initialize database schema if tables don't exist
async function initDb() {
    const queries = [
        // Create BUSINESSES table FIRST since other tables reference it
        `CREATE TABLE IF NOT EXISTS ${tables.BUSINESSES} (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            website TEXT,
            logo_url TEXT,
            settings JSONB DEFAULT '{}'::jsonb,
            status TEXT DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS ${tables.USERS} (
            id SERIAL PRIMARY KEY,
            first_name TEXT,
            last_name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT,
            status TEXT,
            facility_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS ${tables.PROGRAMS} (
            id SERIAL PRIMARY KEY,
            name TEXT,
            details TEXT,
            type TEXT,
            category TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS ${tables.FACILITIES} (
            id SERIAL PRIMARY KEY,
            name TEXT,
            state TEXT,
            lga TEXT,
            address TEXT,
            category TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS ${tables.ACTIVITIES} (
            id SERIAL PRIMARY KEY,
            title TEXT,
            subtitle TEXT,
            program_id INTEGER REFERENCES ${tables.PROGRAMS}(id) ON DELETE SET NULL,
            details TEXT,
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            response_type TEXT,
            category TEXT,
            status TEXT,
            created_by INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
            form_definition JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS ${tables.ACTIVITY_REPORTS} (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES ${tables.ACTIVITIES}(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
            facility_id INTEGER REFERENCES ${tables.FACILITIES}(id) ON DELETE SET NULL,
            status TEXT,
            answers JSONB,
            reviewers_report TEXT,
            overall_score NUMERIC,
            reported_by INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
            submission_date TIMESTAMP DEFAULT NOW()
        )`
        ,
        `CREATE TABLE IF NOT EXISTS ${tables.QUESTIONS} (
            id TEXT PRIMARY KEY,
            activity_id INTEGER REFERENCES ${tables.ACTIVITIES}(id) ON DELETE CASCADE,
            page_name TEXT,
            section_name TEXT,
            question_text TEXT,
            question_helper TEXT,
            answer_type TEXT,
            category TEXT,
            question_group TEXT,
            column_size INTEGER,
            status TEXT,
            options JSONB,
            metadata JSONB,
                created_by INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS ${tables.ANSWERS} (
            id SERIAL PRIMARY KEY,
            report_id INTEGER REFERENCES ${tables.ACTIVITY_REPORTS}(id) ON DELETE CASCADE,
            activity_id INTEGER REFERENCES ${tables.ACTIVITIES}(id) ON DELETE CASCADE,
            question_id TEXT,
            answer_value TEXT,
            answer_row_index INTEGER,
            question_group TEXT,
            answer_group TEXT,
            facility_id INTEGER REFERENCES ${tables.FACILITIES}(id) ON DELETE SET NULL,
            user_id INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
            recorded_by INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
            answer_datetime TIMESTAMP DEFAULT NOW(),
            reviewers_comment TEXT,
            quality_improvement_followup TEXT,
            score NUMERIC,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS ${tables.UPLOADED_DOCS} (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES ${tables.ACTIVITIES}(id) ON DELETE CASCADE,
            facility_id INTEGER REFERENCES ${tables.FACILITIES}(id) ON DELETE SET NULL,
            user_id INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
            uploaded_by INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
                report_id INTEGER REFERENCES ${tables.ACTIVITY_REPORTS}(id) ON DELETE CASCADE,
                file_content JSONB,
            filename TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`
        ,
        `CREATE TABLE IF NOT EXISTS ${tables.RAG_SCHEMAS} (
            id SERIAL PRIMARY KEY,
            table_name TEXT UNIQUE,
            schema JSONB,
            sample_rows JSONB,
            generated_at TIMESTAMP DEFAULT NOW()
        )`
        ,
        `CREATE TABLE IF NOT EXISTS ${tables.DATASETS} (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            dataset_fields JSONB DEFAULT '[]'::jsonb,
            show_in_menu BOOLEAN DEFAULT FALSE,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS ${tables.DATASET_CONTENT} (
            id SERIAL PRIMARY KEY,
            dataset_id INTEGER REFERENCES ${tables.DATASETS}(id) ON DELETE CASCADE,
            dataset_data JSONB,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )`
        , `CREATE TABLE IF NOT EXISTS ${tables.REPORTS_POWERBI} (
            id SERIAL PRIMARY KEY,
            activity_reports_id INTEGER REFERENCES ${tables.ACTIVITY_REPORTS}(id) ON DELETE CASCADE,
            powerbi_link TEXT,
            link_type TEXT,
            mode TEXT,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )`
        , `CREATE TABLE IF NOT EXISTS ${tables.REPORT_TEMPLATES} (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            activity_id INTEGER REFERENCES ${tables.ACTIVITIES}(id) ON DELETE CASCADE,
            template_json JSONB,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )`
        , `CREATE TABLE IF NOT EXISTS ${tables.API_CONNECTORS} (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            base_url TEXT,
            method TEXT DEFAULT 'GET',
            auth_config JSONB,
            expected_format TEXT,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )`
        , `CREATE TABLE IF NOT EXISTS ${tables.API_INGESTS} (
            id SERIAL PRIMARY KEY,
            connector_id INTEGER REFERENCES ${tables.API_CONNECTORS}(id) ON DELETE SET NULL,
            received_at TIMESTAMP DEFAULT NOW(),
            raw_data JSONB,
            metadata JSONB
        )`
    ];

    for (const q of queries) {
        try {
            await pool.query(q);
        } catch (err) {
            console.error('DB init error:', err);
            throw err;
        }
    }
    // Create a default super-admin user if environment variables provided
    try {
        const superEmail = process.env.SUPER_ADMIN_EMAIL || process.env.SUPERADMIN_EMAIL || null;
        const superPass = process.env.SUPER_ADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD || null;
        if (superEmail && superPass) {
            const r = await pool.query(`SELECT id FROM ${tables.USERS} WHERE email = $1`, [superEmail]);
            if (r.rows.length === 0) {
                try {
                    const hash = await bcrypt.hash(superPass, 10);
                    await pool.query(`INSERT INTO ${tables.USERS} (first_name, last_name, email, password, role, status) VALUES ($1,$2,$3,$4,$5,$6)`, ['Super', 'Admin', superEmail, hash, 'super-admin', 'Active']);
                    console.log('Created default super-admin user', superEmail);
                } catch (e) { console.error('Failed to create super-admin', e); }
            }
        }
    } catch (e) { /* ignore */ }
    // Ensure answers table has reviewer/score columns and remove them from questions if present
    try {
        await pool.query(`ALTER TABLE ${tables.ANSWERS} ADD COLUMN IF NOT EXISTS reviewers_comment TEXT`);
        await pool.query(`ALTER TABLE ${tables.ANSWERS} ADD COLUMN IF NOT EXISTS quality_improvement_followup TEXT`);
        await pool.query(`ALTER TABLE ${tables.ANSWERS} ADD COLUMN IF NOT EXISTS score NUMERIC`);
        await pool.query(`ALTER TABLE ${tables.ANSWERS} ADD COLUMN IF NOT EXISTS question_group TEXT`);
        await pool.query(`ALTER TABLE ${tables.ANSWERS} ADD COLUMN IF NOT EXISTS answer_group TEXT`);
        await pool.query(`ALTER TABLE ${tables.ANSWERS} ADD COLUMN IF NOT EXISTS answer_row_index INTEGER`);
        // If existing deployments used JSONB for answer_value, convert to TEXT safely
        try {
            await pool.query(`ALTER TABLE ${tables.ANSWERS} ALTER COLUMN answer_value TYPE TEXT USING (answer_value::text)`);
        } catch (e) {
            // ignore conversion errors in case column already text or conversion not needed
        }
        await pool.query(`ALTER TABLE ${tables.QUESTIONS} ADD COLUMN IF NOT EXISTS required BOOLEAN`);
        // allow storing a correct answer for question types that support it
        await pool.query(`ALTER TABLE ${tables.QUESTIONS} ADD COLUMN IF NOT EXISTS correct_answer TEXT`);
        // Add profile_image to users
        await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS profile_image TEXT`);
        // Add is_demo_account flag for demo users
        await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS is_demo_account BOOLEAN DEFAULT FALSE`);
        // Add business_id for multi-tenancy support
        await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES ${tables.BUSINESSES}(id) ON DELETE SET NULL`);
        // Add account_type (user, admin, etc.)
        await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'user'`);
        // Add last_login_at for tracking user activity
        await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP`);
        // Add account_activated_at for tracking when accounts were activated
        await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS account_activated_at TIMESTAMP`);
        // Add deactivated_at for tracking when accounts were deactivated
        await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP`);
        // Add powerbi_url and related columns to activities to support activity-level Power BI embeds
        await pool.query(`ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS powerbi_url TEXT`);
        await pool.query(`ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS powerbi_link_type TEXT`);
        await pool.query(`ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS powerbi_mode TEXT`);
        // Add show_in_menu flag for datasets so datasets can be shown in sidebar
        await pool.query(`ALTER TABLE ${tables.DATASETS} ADD COLUMN IF NOT EXISTS show_in_menu BOOLEAN DEFAULT FALSE`);
        // Create roles, permissions and settings tables
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.ROLES} (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.PERMISSIONS} (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.ROLE_PERMISSIONS} (
            role_id INTEGER REFERENCES ${tables.ROLES}(id) ON DELETE CASCADE,
            permission_id INTEGER REFERENCES ${tables.PERMISSIONS}(id) ON DELETE CASCADE,
            PRIMARY KEY (role_id, permission_id)
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.USER_ROLES} (
            user_id INTEGER REFERENCES ${tables.USERS}(id) ON DELETE CASCADE,
            role_id INTEGER REFERENCES ${tables.ROLES}(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, role_id)
        )`);
        // Page/section-level permissions: store per-role flags for pages/sections
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.PAGE_PERMISSIONS} (
            id SERIAL PRIMARY KEY,
            page_key TEXT NOT NULL,
            section_key TEXT,
            role_name TEXT NOT NULL,
            can_create BOOLEAN DEFAULT FALSE,
            can_view BOOLEAN DEFAULT TRUE,
            can_edit BOOLEAN DEFAULT FALSE,
            can_delete BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (page_key, section_key, role_name)
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.SETTINGS} (
            key TEXT NOT NULL,
            value JSONB,
            business_id INTEGER,
            PRIMARY KEY (key, business_id),
            FOREIGN KEY (business_id) REFERENCES ${tables.BUSINESSES}(id) ON DELETE CASCADE
        )`);
        // SaaS Plans and Plan Assignments are created in migration_multi_tenancy.sql
        // They are handled during the initializeStartup() call

        // Add business_id FK column to common resource tables for scoping
        const addBusinessCols = [
            tables.USERS, tables.PROGRAMS, tables.FACILITIES, tables.ACTIVITIES, tables.ACTIVITY_REPORTS,
            tables.QUESTIONS, tables.ANSWERS, tables.UPLOADED_DOCS, tables.DATASETS, tables.REPORT_TEMPLATES
        ];
        for (const t of addBusinessCols) {
            try { await pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES ${tables.BUSINESSES}(id) ON DELETE SET NULL`); } catch (e) { /* ignore */ }
        }

        // Ensure ${tables.SETTINGS} has business_id column (critical for multi-tenancy settings)
        try {
            await pool.query(`ALTER TABLE ${tables.SETTINGS} ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES ${tables.BUSINESSES}(id) ON DELETE CASCADE`);
        } catch (e) { /* ignore if already exists */ }

        // If ${tables.SETTINGS} doesn't have proper PRIMARY KEY, we need to handle it
        try {
            // Try to add constraint if it doesn't exist
            await pool.query(`ALTER TABLE ${tables.SETTINGS} DROP CONSTRAINT IF NOT EXISTS ${tables.SETTINGS}_pkey CASCADE`);
        } catch (e) { /* ignore */ }
        try {
            await pool.query(`ALTER TABLE ${tables.SETTINGS} ADD PRIMARY KEY (key, business_id)`);
        } catch (e) { /* ignore if already exists */ }
        // Ensure a unique index exists so ON CONFLICT (key, business_id) works even if primary key couldn't be set
        try {
            await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_${tables.SETTINGS}_key_business ON ${tables.SETTINGS} (key, business_id)`);
        } catch (e) { /* ignore */ }
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.LLM_PROVIDERS} (
            id SERIAL PRIMARY KEY,
            provider_id TEXT,
            name TEXT,
            model TEXT,
            config JSONB,
            priority INTEGER
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.RAG_SCHEMAS} (
            id SERIAL PRIMARY KEY,
            table_name TEXT UNIQUE,
            schema JSONB,
            sample_rows JSONB,
            generated_at TIMESTAMP DEFAULT NOW()
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.RAG_CHROMA_IDS} (
            id SERIAL PRIMARY KEY,
            rag_table_name TEXT,
            chroma_id TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`);
        // Audit batches: store arrays of events pushed from clients (minimalistic records)
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.AUDIT_BATCHES} (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
            events JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        )`);
        // Ensure RAG schemas table has category and business rules fields
        await pool.query(`ALTER TABLE ${tables.RAG_SCHEMAS} ADD COLUMN IF NOT EXISTS category TEXT`);
        await pool.query(`ALTER TABLE ${tables.RAG_SCHEMAS} ADD COLUMN IF NOT EXISTS business_rules TEXT`);
        // Add a minimal text summary field for RAG records to provide concise context to LLMs
        await pool.query(`ALTER TABLE ${tables.RAG_SCHEMAS} ADD COLUMN IF NOT EXISTS summary_text TEXT`);
        // Ensure uploaded_docs has a report_id reference so files can be tied to a specific report
        await pool.query(`ALTER TABLE ${tables.UPLOADED_DOCS} ADD COLUMN IF NOT EXISTS report_id INTEGER`);
        // Ensure activities has response_type and form_definition (sync with schema)
        await pool.query(`ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS response_type TEXT`);
        await pool.query(`ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS form_definition JSONB`);
        // Remove legacy columns from questions if they exist
        await pool.query(`ALTER TABLE ${tables.QUESTIONS} DROP COLUMN IF EXISTS reviewers_comment`);
        await pool.query(`ALTER TABLE ${tables.QUESTIONS} DROP COLUMN IF EXISTS quality_improvement_followup`);
        await pool.query(`ALTER TABLE ${tables.QUESTIONS} DROP COLUMN IF EXISTS score`);
        // Ensure activity_reports schema: remove uploaded_files and data_collection_level, add reviewer report fields
        await pool.query(`ALTER TABLE ${tables.ACTIVITY_REPORTS} DROP COLUMN IF EXISTS uploaded_files`);
        await pool.query(`ALTER TABLE ${tables.ACTIVITY_REPORTS} DROP COLUMN IF EXISTS data_collection_level`);
        await pool.query(`ALTER TABLE ${tables.ACTIVITY_REPORTS} ADD COLUMN IF NOT EXISTS reviewers_report TEXT`);
        await pool.query(`ALTER TABLE ${tables.ACTIVITY_REPORTS} ADD COLUMN IF NOT EXISTS overall_score NUMERIC`);
        await pool.query(`ALTER TABLE ${tables.ACTIVITY_REPORTS} ADD COLUMN IF NOT EXISTS reported_by INTEGER`);
        // Add optional template association for reports
        await pool.query(`ALTER TABLE ${tables.ACTIVITY_REPORTS} ADD COLUMN IF NOT EXISTS report_template_id INTEGER`);
        // Allow storing a picked location and visibility flag on reports and users
        try { await pool.query(`ALTER TABLE ${tables.ACTIVITY_REPORTS} ADD COLUMN IF NOT EXISTS location TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.ACTIVITY_REPORTS} ADD COLUMN IF NOT EXISTS show_on_map BOOLEAN`); } catch (e) { /* ignore */ }
        // Allow assigning a validator to a report
        try { await pool.query(`ALTER TABLE ${tables.ACTIVITY_REPORTS} ADD COLUMN IF NOT EXISTS assigned_validator INTEGER`); } catch (e) { /* ignore */ }
        // Add location and show_on_map to users so user profiles can optionally store coordinates/visibility
        try { await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS location TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS show_on_map BOOLEAN DEFAULT true`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS custom_fields JSONB`); } catch (e) { /* ignore */ }
        // Enhance report templates table to support paper size, orientation and images
        try { await pool.query(`ALTER TABLE ${tables.REPORT_TEMPLATES} ADD COLUMN IF NOT EXISTS paper_size TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.REPORT_TEMPLATES} ADD COLUMN IF NOT EXISTS orientation TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.REPORT_TEMPLATES} ADD COLUMN IF NOT EXISTS header_image TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.REPORT_TEMPLATES} ADD COLUMN IF NOT EXISTS footer_image TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.REPORT_TEMPLATES} ADD COLUMN IF NOT EXISTS watermark_image TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.REPORT_TEMPLATES} ADD COLUMN IF NOT EXISTS assets JSONB`); } catch (e) { /* ignore */ }
        // Add facility location and visibility columns (store as text 'lat,lng')
        try { await pool.query(`ALTER TABLE ${tables.FACILITIES} ADD COLUMN IF NOT EXISTS location TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.FACILITIES} ADD COLUMN IF NOT EXISTS show_on_map BOOLEAN DEFAULT true`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.FACILITIES} ADD COLUMN IF NOT EXISTS custom_fields JSONB`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.FACILITIES} ADD COLUMN IF NOT EXISTS business_id INTEGER`); } catch (e) { /* ignore */ }
        // Email verification tokens for self-registered users
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.EMAIL_VERIFICATIONS} (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ${tables.USERS}(id) ON DELETE CASCADE,
                token TEXT UNIQUE,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )`);
        } catch (e) { /* ignore */ }
        // Add show_on_map to programs and activities so they can be toggled on the map
        try { await pool.query(`ALTER TABLE ${tables.PROGRAMS} ADD COLUMN IF NOT EXISTS show_on_map BOOLEAN DEFAULT true`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS show_on_map BOOLEAN DEFAULT true`); } catch (e) { /* ignore */ }
        // Ensure indicators table exists for computed indicators definitions
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.INDICATORS} (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                activity_id INTEGER REFERENCES ${tables.ACTIVITIES}(id) ON DELETE SET NULL,
                formula TEXT,
                formula_type TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )`);
        } catch (e) { /* ignore */ }
        // Ensure indicator fields requested by UI exist (idempotent)
        try { await pool.query(`ALTER TABLE ${tables.INDICATORS} ADD COLUMN IF NOT EXISTS title TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.INDICATORS} ADD COLUMN IF NOT EXISTS subtitle TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.INDICATORS} ADD COLUMN IF NOT EXISTS indicator_level TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.INDICATORS} ADD COLUMN IF NOT EXISTS unit_of_measurement TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.INDICATORS} ADD COLUMN IF NOT EXISTS show_on_map BOOLEAN DEFAULT false`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.INDICATORS} ADD COLUMN IF NOT EXISTS program_id INTEGER`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.INDICATORS} ADD COLUMN IF NOT EXISTS notes JSONB`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.INDICATORS} ADD COLUMN IF NOT EXISTS status TEXT`); } catch (e) { /* ignore */ }
        // Allow per-row role assignments on dataset content rows
        try { await pool.query(`ALTER TABLE ${tables.DATASET_CONTENT} ADD COLUMN IF NOT EXISTS dataset_roles JSONB DEFAULT '[]'::jsonb`); } catch (e) { /* ignore */ }
        
        // Ensure user approvals table exists
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.USER_APPROVALS} (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ${tables.USERS}(id) ON DELETE CASCADE,
                status TEXT DEFAULT 'Pending',
                approved_by INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
                approval_notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`);
        } catch (e) { /* ignore */ }
        
        // Ensure feedback messages table exists
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.FEEDBACK_MESSAGES} (
                id SERIAL PRIMARY KEY,
                business_id INTEGER,
                sender_name TEXT,
                sender_email TEXT,
                sender_phone TEXT,
                subject TEXT,
                message TEXT,
                status TEXT DEFAULT 'New',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`);
        } catch (e) { /* ignore */ }
        
        // Add last_login_at to users table if missing
        try { await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP`); } catch (e) { /* ignore */ }
        
        // Add business_id to datasets table for multi-tenancy
        try { await pool.query(`ALTER TABLE ${tables.DATASETS} ADD COLUMN IF NOT EXISTS business_id INTEGER`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.DATASET_CONTENT} ADD COLUMN IF NOT EXISTS business_id INTEGER`); } catch (e) { /* ignore */ }
        
        // Create landing page config table if missing
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.LANDING_PAGE_CONFIG} (
                id SERIAL PRIMARY KEY,
                business_id INTEGER UNIQUE,
                hero_title TEXT,
                hero_subtitle TEXT,
                hero_image_url TEXT,
                hero_button_text TEXT,
                hero_button_link TEXT,
                hero_visible BOOLEAN DEFAULT true,
                features_title TEXT,
                features_subtitle TEXT,
                features_data JSONB,
                features_visible BOOLEAN DEFAULT true,
                carousel_title TEXT,
                carousel_items JSONB,
                carousel_visible BOOLEAN DEFAULT true,
                cta_title TEXT,
                cta_subtitle TEXT,
                cta_button_text TEXT,
                cta_button_link TEXT,
                cta_visible BOOLEAN DEFAULT true,
                demo_link TEXT,
                demo_label TEXT,
                footer_text TEXT,
                footer_links JSONB,
                logo_url TEXT,
                favicon_url TEXT,
                company_name TEXT,
                app_name TEXT,
                nav_background_color TEXT DEFAULT '#ffffff',
                nav_text_color TEXT DEFAULT '#000000',
                primary_color TEXT,
                secondary_color TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`);
        } catch (e) { /* ignore */ }
        
        // Ensure ${tables.LANDING_PAGE_CONFIG} has all required columns
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS features_data JSONB`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS carousel_items JSONB`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS carousel_title TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS carousel_visible BOOLEAN DEFAULT true`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS footer_links JSONB`); } catch (e) { /* ignore */ }
        // Add font styling columns for all sections
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS hero_title_font_size TEXT DEFAULT '48px'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS hero_title_font_weight TEXT DEFAULT '700'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS hero_subtitle_font_size TEXT DEFAULT '20px'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS hero_subtitle_font_weight TEXT DEFAULT '400'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS features_title_font_size TEXT DEFAULT '36px'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS features_title_font_weight TEXT DEFAULT '700'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS features_subtitle_font_size TEXT DEFAULT '18px'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS features_subtitle_font_weight TEXT DEFAULT '400'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS carousel_title_font_size TEXT DEFAULT '36px'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS carousel_title_font_weight TEXT DEFAULT '700'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS cta_title_font_size TEXT DEFAULT '36px'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS cta_title_font_weight TEXT DEFAULT '700'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS cta_subtitle_font_size TEXT DEFAULT '18px'`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS cta_subtitle_font_weight TEXT DEFAULT '400'`); } catch (e) { /* ignore */ }
        // New columns for extended landing page features
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS app_name TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS nav_background_color TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS nav_text_color TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS pricing_items JSONB`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS pricing_visible BOOLEAN DEFAULT true`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS pricing_currency TEXT`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS custom_pages JSONB`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS hero_featured_images JSONB`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD COLUMN IF NOT EXISTS locked_organization_id INTEGER`); } catch (e) { /* ignore */ }
        // Remove foreign key constraint on business_id (not needed for universal config)
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} DROP CONSTRAINT IF EXISTS ${tables.LANDING_PAGE_CONFIG}_business_id_fkey`); } catch (e) { /* ignore */ }
        // Ensure unique constraint on business_id exists (for ON CONFLICT clause)
        try { await pool.query(`ALTER TABLE ${tables.LANDING_PAGE_CONFIG} ADD CONSTRAINT unique_business_id UNIQUE(business_id)`); } catch (e) { /* ignore - may already exist */ }

        // Create ${tables.FORM_SCHEMAS} table for custom form field definitions
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.FORM_SCHEMAS} (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                "formType" VARCHAR(50) NOT NULL,
                fields JSONB DEFAULT '[]'::jsonb,
                business_id INTEGER,
                "createdAt" TIMESTAMP DEFAULT NOW(),
                "updatedAt" TIMESTAMP DEFAULT NOW(),
                UNIQUE ("formType", business_id)
            )`);
            console.log(`${tables.FORM_SCHEMAS} table created/verified`);
        } catch (err) {
            console.error(`Failed to create ${tables.FORM_SCHEMAS} table:`, err);
        }

        // Create PLANS table for subscription/licensing
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.PLANS} (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price NUMERIC(10, 2) DEFAULT 0,
                max_programs_per_business INTEGER DEFAULT -1,
                max_activities_per_program INTEGER DEFAULT -1,
                max_questions_per_activity INTEGER DEFAULT -1,
                max_facilities INTEGER DEFAULT -1,
                max_users INTEGER DEFAULT -1,
                features JSONB DEFAULT '{}'::jsonb,
                status TEXT DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`);
        } catch (err) { /* ignore - table may already exist */ }

        // Create PLAN_ASSIGNMENTS table
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.PLAN_ASSIGNMENTS} (
                id SERIAL PRIMARY KEY,
                plan_id INTEGER REFERENCES ${tables.PLANS}(id) ON DELETE SET NULL,
                business_id INTEGER REFERENCES ${tables.BUSINESSES}(id) ON DELETE CASCADE,
                assigned_by INTEGER REFERENCES ${tables.USERS}(id) ON DELETE SET NULL,
                status TEXT DEFAULT 'Active',
                start_date DATE,
                end_date DATE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`);
        } catch (err) { /* ignore - table may already exist */ }
    } catch (err) {
        console.error('Failed to sync reviewer/score columns between questions and answers:', err);
        throw err;
    }
    // Ensure legacy tables get required columns (safe check + alter if missing)
    try {
        const colCheck = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name='password'`, [tables.USERS.replace(/^${TABLE_PREFIX}/, '')]);
        if (colCheck.rowCount === 0) {
            console.log(`${tables.USERS}.password column missing — adding column`);
            await pool.query(`ALTER TABLE ${tables.USERS} ADD COLUMN password TEXT`);
            console.log(`${tables.USERS}.password column added`);
        } else {
            console.log('users.password column already exists');
        }
    } catch (err) {
        console.error('Failed to ensure users.password column exists:', err);
        throw err;
    }
    console.log('Database initialized (tables ensured).');
    // If TABLE_PREFIX is set and different from the default 'dqai_', create
    // a second set of tables using that prefix. This avoids changing the
    // application's runtime SQL while ensuring prefixed tables exist when
    // deploying to environments that expect a different prefix.
    try {
        const runtimeTablePrefix = (process.env.TABLE_PREFIX || '').toString().trim();
        if (runtimeTablePrefix && runtimeTablePrefix !== 'dqai_') {
            try {
                const cfg = {
                    user: process.env.DB_USER || 'postgres',
                    host: process.env.DB_HOST || 'localhost',
                    database: process.env.DB_NAME || 'dqappdb',
                    password: process.env.DB_PASSWORD || 'admin',
                    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
                    type: 'pg'
                };
                console.log(`[startup] Creating additional prefixed tables using TABLE_PREFIX='${runtimeTablePrefix}'`);
                await createAppTablesInTarget(cfg, runtimeTablePrefix);
                console.log(`[startup] Prefixed tables created for '${runtimeTablePrefix}'`);
            } catch (e) {
                console.warn('Failed to create prefixed tables for TABLE_PREFIX:', runtimeTablePrefix, e && e.message ? e.message : e);
            }
        }
    } catch (e) {
        console.warn('TABLE_PREFIX creation check failed', e && e.message ? e.message : e);
    }
    // Ensure default admin user exists
    try {
        const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin1234';
        // Hash default admin password before storing
        let hashedAdminPassword = null;
        try {
            hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
        } catch (e) {
            console.error('Failed to hash default admin password:', e);
            hashedAdminPassword = adminPassword; // fallback to plaintext (will be attempted to migrate on login)
        }
        // Only create a default admin if no Admin user exists. This avoids overwriting
        // or re-creating the default admin when an Admin account has been modified by the user.
        try {
            const adminsRes = await pool.query(`SELECT u.id FROM ${tables.USERS} u WHERE u.role = 'Admin' OR u.id IN (SELECT ur.user_id FROM ${tables.USER_ROLES} ur JOIN ${tables.ROLES} r ON ur.role_id = r.id WHERE LOWER(r.name) = 'admin') LIMIT 1`);
            if (!adminsRes.rows || adminsRes.rows.length === 0) {
                // No admin user exists; create the default admin
                await pool.query(
                    `INSERT INTO ${tables.USERS} (first_name, last_name, email, password, role, status) VALUES ($1, $2, $3, $4, $5, $6)`,
                    ['System', 'Administrator', adminEmail, hashedAdminPassword, 'Admin', 'Active']
                );
                console.log('Default admin user created:', adminEmail);
            } else {
                console.log('Admin user(s) already exist; skipping default admin creation.');
            }
        } catch (e) {
            console.error('Failed to ensure default admin user safely:', e);
        }
    } catch (err) {
        console.error('Failed to ensure default admin user', err);
    }



    // Seed default roles and permissions if missing
    try {
        const perms = [
            ['manage_users', 'Create, update and delete users'],
            ['manage_roles', 'Manage roles and permissions'],
            ['manage_settings', 'Update system settings and LLM providers'],
            ['edit_forms', 'Create and edit form definitions'],
            ['submit_reports', 'Submit reports/responses'],
            ['view_reports', 'View reports and dashboards'],
            ['manage_llm', 'Manage LLM providers and RAG settings']
        ];
        for (const [name, desc] of perms) {
            await pool.query(`INSERT INTO ${tables.PERMISSIONS} (name, description) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING`, [name, desc]);
        }

        const roles = [
            ['Admin', 'Full system administrator'],
            ['Form Builder', 'Design and publish forms'],
            ['Data Collector', 'Collect and submit data in the field'],
            ['Reviewer', 'Review submitted reports and provide feedback'],
            ['Viewer', 'Read-only access to reports and dashboards']
        ];
        for (const [name, desc] of roles) {
            await pool.query(`INSERT INTO ${tables.ROLES} (name, description) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING`, [name, desc]);
        }

        // Map role to permissions
        const rolePermMap = {
            'Admin': ['manage_users', 'manage_roles', 'manage_settings', 'edit_forms', 'submit_reports', 'view_reports', 'manage_llm'],
            'Form Builder': ['edit_forms', 'view_reports'],
            'Data Collector': ['submit_reports', 'view_reports'],
            'Reviewer': ['view_reports', 'manage_llm'],
            'Viewer': ['view_reports']
        };
        for (const [roleName, permNames] of Object.entries(rolePermMap)) {
            const r = await pool.query(`SELECT id FROM ${tables.ROLES} WHERE name = $1`, [roleName]);
            if (r.rows.length === 0) continue;
            const roleId = r.rows[0].id;
            for (const pname of permNames) {
                const p = await pool.query(`SELECT id FROM ${tables.PERMISSIONS} WHERE name = $1`, [pname]);
                if (p.rows.length === 0) continue;
                const permId = p.rows[0].id;
                await pool.query(`INSERT INTO ${tables.ROLE_PERMISSIONS} (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [roleId, permId]);
            }
        }
        console.log('Default roles and permissions seeded (if they were missing).');
    } catch (err) {
        console.error('Failed to seed roles/permissions:', err);
    }

    // After seeding roles, ensure default admin user is assigned the Admin role in user_roles
    try {
        const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
        const ures = await pool.query(`SELECT id FROM ${tables.USERS} WHERE email = $1`, [adminEmail]);
        const rres = await pool.query(`SELECT id FROM ${tables.ROLES} WHERE name = 'Admin'`);
        if (ures.rows.length > 0 && rres.rows.length > 0) {
            const userId = ures.rows[0].id;
            const roleId = rres.rows[0].id;
            await pool.query(`INSERT INTO ${tables.USER_ROLES} (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, roleId]);
            console.log('Assigned Admin role to default admin user (post-seed)');
        } else {
            console.log('Admin user or Admin role not found during post-seed assignment');
        }
    } catch (err) {
        console.error('Failed to assign Admin role to default admin user (post-seed):', err);
    }

    // Startup domain data seeding for programs/activities/questions/answers/facilities
    // has been intentionally disabled. Table creation/migrations are still run above,
    // and any required sample or domain data should be created via the admin UI or
    // manual seed scripts (e.g., server/scripts/seed_activity.js) to avoid accidental
    // population in production environments.
    console.log('Skipping automatic seeding of programs/activities/questions/answers/facilities on startup.');

    // Initialize multi-tenancy features and startup configuration
    await initializeStartup(pool);
}

// Helper: connect to an arbitrary target DB (Postgres or MySQL). Returns { type: 'pg'|'mysql', client }
async function connectToTargetDB(cfg) {
    // cfg: { user, host, database, password, port, type }
    const typeHint = (cfg.type || '').toString().toLowerCase();
    const port = Number(cfg.port || 0);
    if (typeHint === 'mysql' || port === 3306) {
        // dynamic import to avoid hard dependency unless used
        try {
            const mysql = await import('mysql2/promise');
            const conn = await mysql.createConnection({ host: cfg.host, user: cfg.user, database: cfg.database, password: cfg.password, port: cfg.port ? Number(cfg.port) : undefined });
            return { type: 'mysql', client: conn };
        } catch (e) {
            throw new Error('mysql2 is required to connect to MySQL target DB. Install it: npm install mysql2');
        }
    }

    // default: Postgres
    const pool = new Pool({ user: cfg.user, host: cfg.host, database: cfg.database, password: cfg.password, port: cfg.port ? Number(cfg.port) : undefined, connectionTimeoutMillis: 10000 });
    // test
    await pool.query('SELECT 1');
    return { type: 'pg', client: pool };
}

// Create the app tables in the target DB with prefix (e.g., dqai_)
async function createAppTablesInTarget(cfg, prefix = 'dqai_') {
    const connObj = await connectToTargetDB(cfg);
    try {
        if (connObj.type === 'pg') {
            const p = connObj.client;
            const q = async (sql) => await p.query(sql);
            // Use JSONB in Postgres
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}users" (
                id SERIAL PRIMARY KEY,
                first_name TEXT,
                last_name TEXT,
                email TEXT UNIQUE,
                password TEXT,
                role TEXT,
                status TEXT,
                facility_id INTEGER,
                profile_image TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}programs" (
                id SERIAL PRIMARY KEY,
                name TEXT,
                details TEXT,
                type TEXT,
                category TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}facilities" (
                id SERIAL PRIMARY KEY,
                name TEXT,
                state TEXT,
                lga TEXT,
                address TEXT,
                category TEXT
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}activities" (
                id SERIAL PRIMARY KEY,
                title TEXT,
                subtitle TEXT,
                program_id INTEGER,
                details TEXT,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                response_type TEXT,
                category TEXT,
                status TEXT,
                created_by INTEGER,
                form_definition JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW()
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}activity_reports" (
                id SERIAL PRIMARY KEY,
                activity_id INTEGER,
                user_id INTEGER,
                facility_id INTEGER,
                status TEXT,
                answers JSONB,
                reviewers_report TEXT,
                overall_score NUMERIC,
                reported_by INTEGER,
                submission_date TIMESTAMP DEFAULT NOW()
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}questions" (
                id TEXT PRIMARY KEY,
                activity_id INTEGER,
                page_name TEXT,
                section_name TEXT,
                question_text TEXT,
                question_helper TEXT,
                answer_type TEXT,
                category TEXT,
                question_group TEXT,
                column_size INTEGER,
                status TEXT,
                options JSONB,
                metadata JSONB,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}answers" (
                id SERIAL PRIMARY KEY,
                report_id INTEGER,
                activity_id INTEGER,
                question_id TEXT,
                answer_value JSONB,
                facility_id INTEGER,
                user_id INTEGER,
                recorded_by INTEGER,
                answer_datetime TIMESTAMP DEFAULT NOW(),
                reviewers_comment TEXT,
                quality_improvement_followup TEXT,
                score NUMERIC,
                created_at TIMESTAMP DEFAULT NOW()
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}uploaded_docs" (
                id SERIAL PRIMARY KEY,
                activity_id INTEGER,
                facility_id INTEGER,
                user_id INTEGER,
                uploaded_by INTEGER,
                file_content JSONB,
                filename TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}roles" (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}permissions" (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}role_permissions" (
                role_id INTEGER,
                permission_id INTEGER,
                PRIMARY KEY (role_id, permission_id)
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}user_roles" (
                user_id INTEGER,
                role_id INTEGER,
                PRIMARY KEY (user_id, role_id)
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}settings" (
                key TEXT PRIMARY KEY,
                value JSONB
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}llm_providers" (
                id SERIAL PRIMARY KEY,
                provider_id TEXT,
                name TEXT,
                model TEXT,
                config JSONB,
                priority INTEGER
            )`);
            await q(`CREATE TABLE IF NOT EXISTS "${prefix}rag_schemas" (
                id SERIAL PRIMARY KEY,
                table_name TEXT UNIQUE,
                schema JSONB,
                sample_rows JSONB,
                generated_at TIMESTAMP DEFAULT NOW()
            )`);
            return { ok: true };
        } else if (connObj.type === 'mysql') {
            const c = connObj.client;
            const exec = async (sql) => await c.execute(sql);
            // Use JSON type in MySQL (5.7+); fallback to LONGTEXT if not supported by target
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}users\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                first_name TEXT,
                last_name TEXT,
                email TEXT UNIQUE,
                password TEXT,
                role TEXT,
                status TEXT,
                facility_id INT,
                profile_image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}programs\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name TEXT,
                details TEXT,
                type TEXT,
                category TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}facilities\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name TEXT,
                state TEXT,
                lga TEXT,
                address TEXT,
                category TEXT
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}activities\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title TEXT,
                subtitle TEXT,
                program_id INT,
                details TEXT,
                start_date DATETIME,
                end_date DATETIME,
                response_type TEXT,
                category TEXT,
                status TEXT,
                created_by INT,
                form_definition JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}activity_reports\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                activity_id INT,
                user_id INT,
                facility_id INT,
                status TEXT,
                answers JSON,
                reviewers_report TEXT,
                overall_score DECIMAL(10,2),
                reported_by INT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}questions\` (
                id VARCHAR(255) PRIMARY KEY,
                activity_id INT,
                page_name TEXT,
                section_name TEXT,
                question_text TEXT,
                question_helper TEXT,
                answer_type TEXT,
                category TEXT,
                question_group TEXT,
                column_size INT,
                status TEXT,
                options JSON,
                metadata JSON,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}answers\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_id INT,
                activity_id INT,
                question_id VARCHAR(255),
                answer_value JSON,
                facility_id INT,
                user_id INT,
                recorded_by INT,
                answer_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewers_comment TEXT,
                quality_improvement_followup TEXT,
                score DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}uploaded_docs\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                activity_id INT,
                facility_id INT,
                user_id INT,
                uploaded_by INT,
                file_content JSON,
                filename TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}roles\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name TEXT UNIQUE,
                description TEXT
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}permissions\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name TEXT UNIQUE,
                description TEXT
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}role_permissions\` (
                role_id INT,
                permission_id INT,
                PRIMARY KEY (role_id, permission_id)
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}user_roles\` (
                user_id INT,
                role_id INT,
                PRIMARY KEY (user_id, role_id)
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}settings\` (
                \`key\` TEXT PRIMARY KEY,
                value JSON
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}llm_providers\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                provider_id TEXT,
                name TEXT,
                model TEXT,
                config JSON,
                priority INT
            )`);
            await exec(`CREATE TABLE IF NOT EXISTS \`${prefix}rag_schemas\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                table_name TEXT,
                schema JSON,
                sample_rows JSON,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            return { ok: true };
        }
    } finally {
        try { if (connObj.type === 'pg') await connObj.client.end(); else await connObj.client.end(); } catch (e) { /* ignore */ }
    }
}

// Generate RAG schemas (columns + samples) from target DB and store in local rag_schemas and optionally push to CHROMA
async function generateRagFromTarget(cfg, prefix = 'dqai_') {
    const connObj = await connectToTargetDB(cfg);
    try {
        let tables = [];
        if (connObj.type === 'pg') {
            const p = connObj.client;
            const tres = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
            tables = tres.rows.map(r => r.table_name).filter(t => t && t.startsWith(prefix));
            for (const t of tables) {
                const colsRes = await p.query('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1', [t]);
                let sample = [];
                try { const sres = await p.query(`SELECT * FROM "${t}" LIMIT 5`); sample = truncateSampleRows(sres.rows); } catch (e) { sample = []; }
                // upsert into local rag_schemas (without prefix in stored name)
                const shortName = t.startsWith(prefix) ? t.slice(prefix.length) : t;
                await pool.query(`INSERT INTO ${tables.RAG_SCHEMAS} (table_name, schema, sample_rows) VALUES ($1,$2,$3) ON CONFLICT (table_name) DO UPDATE SET schema = $2, sample_rows = $3, generated_at = NOW()`, [shortName, JSON.stringify(colsRes.rows), JSON.stringify(sample)]);
                // optional: push to Chroma/Vector DB if configured via CHROMA_API_URL
                if (process.env.CHROMA_API_URL) {
                    try {
                        const chromaUrl = (process.env.CHROMA_API_URL || '').replace(/\/$/, '');
                        for (let i = 0; i < sample.length; i++) {
                            const row = sample[i];
                            const chromaId = `${shortName}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
                            try {
                                await fetch(chromaUrl + '/index', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: chromaId, text: JSON.stringify(row), metadata: { table: shortName, rowIndex: i } }) });
                                try { await pool.query(`INSERT INTO ${tables.RAG_CHROMA_IDS} (rag_table_name, chroma_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [shortName, chromaId]); } catch (e) { /* ignore */ }
                            } catch (e) { console.error('Failed to index row to Chroma for', shortName, e); }
                        }
                    } catch (e) { console.error('Failed to push to CHROMA for', shortName, e); }
                }
            }
        } else if (connObj.type === 'mysql') {
            const c = connObj.client;
            const [trows] = await c.execute("SHOW TABLES");
            const key = Object.keys(trows[0] || {})[0];
            tables = trows.map(r => r[key]).filter(t => t && t.startsWith(prefix));
            for (const t of tables) {
                const [cols] = await c.execute(`DESCRIBE \`${t}\``);
                let sample = [];
                try { const [srows] = await c.execute(`SELECT * FROM \`${t}\` LIMIT 5`); sample = truncateSampleRows(srows); } catch (e) { sample = []; }
                const shortName = t.startsWith(prefix) ? t.slice(prefix.length) : t;
                await pool.query(`INSERT INTO ${tables.RAG_SCHEMAS} (table_name, schema, sample_rows) VALUES ($1,$2,$3) ON CONFLICT (table_name) DO UPDATE SET schema = $2, sample_rows = $3, generated_at = NOW()`, [shortName, JSON.stringify(cols), JSON.stringify(sample)]);
                if (process.env.CHROMA_API_URL) {
                    try {
                        const chromaUrl = (process.env.CHROMA_API_URL || '').replace(/\/$/, '');
                        for (let i = 0; i < sample.length; i++) {
                            const row = sample[i];
                            const chromaId = `${shortName}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
                            try {
                                await fetch(chromaUrl + '/index', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: chromaId, text: JSON.stringify(row), metadata: { table: shortName, rowIndex: i } }) });
                                try { await pool.query(`INSERT INTO ${tables.RAG_CHROMA_IDS} (rag_table_name, chroma_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [shortName, chromaId]); } catch (e) { /* ignore */ }
                            } catch (e) { console.error('Failed to index row to Chroma for', shortName, e); }
                        }
                    } catch (e) { console.error('Failed to push to CHROMA for', shortName, e); }
                }
            }
        }
        return { ok: true, processed: tables.length };
    } finally {
        try { if (connObj.type === 'pg') await connObj.client.end(); else await connObj.client.end(); } catch (e) { }
    }
}

// Helper: normalize admin role to 'Admin' (capital A) for consistent permissions
function normalizeAdminRole(role) {
    if (!role) return role;
    const normalized = String(role).toLowerCase();
    if (normalized === 'admin' || normalized === 'super-admin' || normalized === 'super_admin') {
        if (normalized === 'admin') return 'Admin';
        if (normalized === 'super-admin' || normalized === 'super_admin') return 'super-admin';
    }
    return role;
}

// Helper: require admin middleware
async function requireAdmin(req, res, next) {
    try {
        if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
        const r = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
        if (r.rows.length === 0) return res.status(401).json({ error: 'Unauthorized' });
        const roleFromUser = (r.rows[0].role || '').toString().toLowerCase();
        if (roleFromUser === 'admin' || roleFromUser === 'super-admin' || roleFromUser === 'super_admin') return next();
        // Also allow admin if the user has an Admin role assignment in user_roles -> roles
        try {
            const rr = await pool.query(`SELECT r.name FROM ${tables.USER_ROLES} ur JOIN ${tables.ROLES} r ON ur.role_id = r.id WHERE ur.user_id = $1`, [req.session.userId]);
            for (const row of rr.rows) {
                if (row && row.name && row.name.toString().toLowerCase() === 'admin') return next();
            }
        } catch (innerErr) {
            console.error('requireAdmin role-check error', innerErr);
            // continue to forbidden if lookup fails
        }
        return res.status(403).json({ error: 'Forbidden - admin only' });
    } catch (e) { console.error('requireAdmin error', e); return res.status(500).json({ error: 'Server error' }); }
}

// Helper: check super-admin role
async function isSuperAdmin(req) {
    try {
        if (!req.session || !req.session.userId) return false;
        const r = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
        if (r.rows.length === 0) return false;
        const roleFromUser = (r.rows[0].role || '').toString().toLowerCase();
        return roleFromUser === 'super-admin' || roleFromUser === 'superadmin' || roleFromUser === 'super admin';
    } catch (e) { return false; }
}

// Admin: read .env DB-related settings
app.get('/api/admin/env', requireAdmin, async (req, res) => {
    try {
        // Also attempt to read .env.local if present and merge values (env.local takes precedence)
        const envPathLocal = path.resolve(process.cwd(), '.env.local');
        let localMap = {};
        try {
            const raw = await fs.promises.readFile(envPathLocal, 'utf8');
            raw.split(/\r?\n/).forEach(l => { const idx = l.indexOf('='); if (idx > -1) localMap[l.slice(0, idx)] = l.slice(idx + 1); });
        } catch (e) { /* ignore missing */ }
        const env = {
            dbUser: localMap.DB_USER || process.env.DB_USER || '',
            dbHost: localMap.DB_HOST || process.env.DB_HOST || '',
            dbName: localMap.DB_NAME || process.env.DB_NAME || '',
            dbPort: localMap.DB_PORT || process.env.DB_PORT || '',
            dbPassword: localMap.DB_PASSWORD || process.env.DB_PASSWORD || ''
        };
        res.json(env);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to read env' }); }
});

// Public: expose TinyMCE API key from server .env (if set)
// This endpoint returns { key: '...' } so frontend can initialize TinyMCE with the configured key.
// The key comes from process.env.TINY_MCE_API_KEY and is returned as-is. Caller should handle absence.
// NOTE: This endpoint is intentionally public (no authentication required) so editors can load TinyMCE
app.get('/api/tiny_mce_key', async (req, res) => {
    try {
        const key = process.env.TINY_MCE_API_KEY || null;
        res.json({ key });
    } catch (e) {
        console.error('tiny_mce_key error', e);
        res.status(500).json({ key: null });
    }
});

// Admin: write DB env values to .env file (merges existing values)
app.post('/api/admin/env', requireAdmin, async (req, res) => {
    try {
        const payload = req.body || {};
        const envPath = path.resolve(process.cwd(), '.env');
        let content = '';
        try { content = await fs.promises.readFile(envPath, 'utf8'); } catch (e) { content = ''; }
        const lines = content.split(/\r?\n/).filter(Boolean);
        const map = {};
        for (const l of lines) {
            const idx = l.indexOf('='); if (idx > -1) { map[l.slice(0, idx)] = l.slice(idx + 1); }
        }
        if (payload.dbUser !== undefined) map['DB_USER'] = String(payload.dbUser);
        if (payload.dbHost !== undefined) map['DB_HOST'] = String(payload.dbHost);
        if (payload.dbName !== undefined) map['DB_NAME'] = String(payload.dbName);
        if (payload.dbPort !== undefined) map['DB_PORT'] = String(payload.dbPort);
        if (payload.dbPassword !== undefined) map['DB_PASSWORD'] = String(payload.dbPassword);
        const out = Object.entries(map).map(([k, v]) => `${k}=${v}`).join('\n');
        await fs.promises.writeFile(envPath, out, 'utf8');
        // also update process.env (effective until restart)
        process.env.DB_USER = map['DB_USER']; process.env.DB_HOST = map['DB_HOST']; process.env.DB_NAME = map['DB_NAME']; process.env.DB_PORT = map['DB_PORT']; process.env.DB_PASSWORD = map['DB_PASSWORD'];
        // also write to .env.local for frontend defaults
        try {
            const localPath = path.resolve(process.cwd(), '.env.local');
            await fs.promises.writeFile(localPath, out, 'utf8');
        } catch (e) { console.error('Failed to write .env.local', e); }

        // Attempt to generate RAG schemas for the target DB
        (async () => {
            try {
                const targetConfig = {
                    user: map['DB_USER'], host: map['DB_HOST'], database: map['DB_NAME'], password: map['DB_PASSWORD'], port: map['DB_PORT'] ? Number(map['DB_PORT']) : undefined
                };
                const tempPool = new Pool(targetConfig);
                // get list of tables in public schema
                const tablesRes = await tempPool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
                for (const r of tablesRes.rows) {
                    const tname = r.table_name;
                    // columns
                    const colsRes = await tempPool.query('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1', [tname]);
                    const schema = colsRes.rows;
                    // sample rows
                    let sample = [];
                    try {
                        const sres = await tempPool.query(`SELECT * FROM "${tname}" LIMIT 5`);
                        sample = truncateSampleRows(sres.rows);
                    } catch (e) { /* ignore sampling errors */ }
                    // upsert into rag_schemas
                    await pool.query(`INSERT INTO ${tables.RAG_SCHEMAS} (table_name, schema, sample_rows) VALUES ($1,$2,$3) ON CONFLICT (table_name) DO UPDATE SET schema = $2, sample_rows = $3, generated_at = NOW()`, [tname, JSON.stringify(schema), JSON.stringify(sample)]);
                }
                await tempPool.end();
                console.log('RAG schemas generated/updated based on provided DB settings');
            } catch (e) { console.error('Failed to generate RAG schemas:', e); }
        })();
        res.json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to write env' }); }
});

// Public write env (no auth) - used by Settings UI when no admin session is present
app.post('/api/env', async (req, res) => {
    try {
        const payload = req.body || {};
        const envPath = path.resolve(process.cwd(), '.env');
        let content = '';
        try { content = await fs.promises.readFile(envPath, 'utf8'); } catch (e) { content = ''; }
        const lines = content.split(/\r?\n/).filter(Boolean);
        const map = {};
        for (const l of lines) {
            const idx = l.indexOf('='); if (idx > -1) { map[l.slice(0, idx)] = l.slice(idx + 1); }
        }
        if (payload.dbUser !== undefined) map['DB_USER'] = String(payload.dbUser);
        if (payload.dbHost !== undefined) map['DB_HOST'] = String(payload.dbHost);
        if (payload.dbName !== undefined) map['DB_NAME'] = String(payload.dbName);
        if (payload.dbPort !== undefined) map['DB_PORT'] = String(payload.dbPort);
        if (payload.dbPassword !== undefined) map['DB_PASSWORD'] = String(payload.dbPassword);
        const out = Object.entries(map).map(([k, v]) => `${k}=${v}`).join('\n');
        await fs.promises.writeFile(envPath, out, 'utf8');
        process.env.DB_USER = map['DB_USER']; process.env.DB_HOST = map['DB_HOST']; process.env.DB_NAME = map['DB_NAME']; process.env.DB_PORT = map['DB_PORT']; process.env.DB_PASSWORD = map['DB_PASSWORD'];
        try {
            const localPath = path.resolve(process.cwd(), '.env.local');
            await fs.promises.writeFile(localPath, out, 'utf8');
        } catch (e) { console.error('Failed to write .env.local', e); }

        // Attempt to generate RAG schemas asynchronously (best-effort)
        (async () => {
            try {
                const targetConfig = {
                    user: map['DB_USER'], host: map['DB_HOST'], database: map['DB_NAME'], password: map['DB_PASSWORD'], port: map['DB_PORT'] ? Number(map['DB_PORT']) : undefined
                };
                const tempPool = new Pool(targetConfig);
                const tablesRes = await tempPool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
                for (const r of tablesRes.rows) {
                    const tname = r.table_name;
                    const colsRes = await tempPool.query('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1', [tname]);
                    const schema = colsRes.rows;
                    let sample = [];
                    try { const sres = await tempPool.query(`SELECT * FROM "${tname}" LIMIT 5`); sample = truncateSampleRows(sres.rows); } catch (e) { /* ignore */ }
                    await pool.query(`INSERT INTO ${tables.RAG_SCHEMAS} (table_name, schema, sample_rows) VALUES ($1,$2,$3) ON CONFLICT (table_name) DO UPDATE SET schema = $2, sample_rows = $3, generated_at = NOW()`, [tname, JSON.stringify(schema), JSON.stringify(sample)]);
                }
                await tempPool.end();
                console.log('RAG schemas generated/updated (public env update)');
            } catch (e) { console.error('Failed to generate RAG schemas (public env):', e); }
        })();

        res.json({ success: true });
    } catch (e) { console.error('public env write error', e); res.status(500).json({ error: 'Failed to write env' }); }
});

// Admin: list tables in public schema
app.get('/api/admin/db/tables', requireAdmin, async (req, res) => {
    try {
        const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
        return res.json({ tables: r.rows.map(rw => rw.table_name) });
    } catch (e) { console.error('admin db tables error', e); return res.status(500).json({ error: String(e) }); }
});

// Admin: get all page/section permissions
app.get('/api/admin/page_permissions', requireAdmin, async (req, res) => {
    try {
        const r = await pool.query(`SELECT * FROM ${tables.PAGE_PERMISSIONS} ORDER BY page_key, section_key, role_name`);
        res.json(r.rows);
    } catch (e) { console.error('admin page_permissions get error', e); res.status(500).json({ error: 'Failed to fetch page permissions' }); }
});

// Public: get permissions for a specific role (used by frontend to enforce per-page/section visibility)
app.get('/api/page_permissions', async (req, res) => {
    try {
        const role = String(req.query.role || req.query.roleName || '').trim();
        if (!role) return res.status(400).json({ error: 'Missing role query param' });
        const r = await pool.query(`SELECT * FROM ${tables.PAGE_PERMISSIONS} WHERE role_name = $1 ORDER BY page_key, section_key`, [role]);
        res.json(r.rows);
    } catch (e) { console.error('page_permissions fetch error', e); res.status(500).json({ error: 'Failed to fetch page permissions' }); }
});

// Admin: replace page_permissions (accepts array of permission objects)
app.post('/api/admin/page_permissions', requireAdmin, async (req, res) => {
    try {
        const list = Array.isArray(req.body) ? req.body : (req.body && Array.isArray(req.body.permissions) ? req.body.permissions : null);
        if (!list) return res.status(400).json({ error: 'Missing permissions array' });
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Upsert each permission
            for (const p of list) {
                const pageKey = p.page_key || p.pageKey || p.page || '';
                const sectionKey = (p.section_key || p.sectionKey || p.section) || null;
                const roleName = p.role_name || p.roleName || p.role || '';
                const canCreate = !!p.can_create || !!p.canCreate;
                const canView = (p.can_view === undefined && p.canView === undefined) ? true : (!!p.can_view || !!p.canView);
                const canEdit = !!p.can_edit || !!p.canEdit;
                const canDelete = !!p.can_delete || !!p.canDelete;
                if (!pageKey || !roleName) continue;
                await client.query(`INSERT INTO ${tables.PAGE_PERMISSIONS} (page_key, section_key, role_name, can_create, can_view, can_edit, can_delete)
                    VALUES ($1,$2,$3,$4,$5,$6,$7)
                    ON CONFLICT (page_key, section_key, role_name) DO UPDATE SET can_create = EXCLUDED.can_create, can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit, can_delete = EXCLUDED.can_delete`, [pageKey, sectionKey, roleName, canCreate, canView, canEdit, canDelete]);
            }
            await client.query('COMMIT');
            res.json({ success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('admin page_permissions save error', e);
            res.status(500).json({ error: 'Failed to save permissions' });
        } finally { client.release(); }
    } catch (e) { console.error('admin page_permissions error', e); res.status(500).json({ error: 'Server error' }); }
});

// Admin: get table schema (columns)
app.get('/api/admin/db/table/:table/schema', requireAdmin, async (req, res) => {
    try {
        const t = req.params.table;
        const cols = await pool.query('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', [t]);
        return res.json({ table: t, columns: cols.rows });
    } catch (e) { console.error('admin table schema error', e); return res.status(500).json({ error: String(e) }); }
});

// Admin: get table info (primary keys, foreign keys)
app.get('/api/admin/db/table/:table/info', requireAdmin, async (req, res) => {
    try {
        const t = req.params.table;
        const pkRes = await pool.query(`SELECT kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.constraint_schema = tc.constraint_schema WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1`, [t]);
        const fkRes = await pool.query(`SELECT kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1`, [t]);
        return res.json({ table: t, primaryKeys: pkRes.rows.map(r => r.column_name), foreignKeys: fkRes.rows });
    } catch (e) { console.error('admin table info error', e); return res.status(500).json({ error: String(e) }); }
});

// Admin: fetch rows for a table with pagination and optional text search across text-like columns
app.get('/api/admin/db/table/:table/rows', requireAdmin, async (req, res) => {
    try {
        const t = req.params.table;
        const limit = Math.min(1000, Math.max(1, Number(req.query.limit || 50)));
        const offset = Math.max(0, Number(req.query.offset || 0));
        const search = (req.query.search || '').toString().trim();

        // If search provided, find text-like columns and build an ILIKE OR clause
        let where = '';
        const params = [];
        if (search) {
            const colsRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [t]);
            const textCols = colsRes.rows.filter(c => /char|text|varchar|json|jsonb/i.test(c.data_type)).map(c => c.column_name);
            if (textCols.length) {
                const clauses = textCols.map((c, i) => `CAST("${c}" AS TEXT) ILIKE $${i + 1}`);
                where = 'WHERE ' + clauses.join(' OR ');
                for (let i = 0; i < textCols.length; i++) params.push(`%${search}%`);
            }
        }

        const sql = `SELECT * FROM "${t}" ${where} ORDER BY 1 LIMIT ${limit} OFFSET ${offset}`;
        const rowsRes = await pool.query(sql, params);
        // also return total count (rough) if no search or small table
        let total = null;
        try {
            const cntRes = await pool.query(`SELECT COUNT(*)::int as cnt FROM "${t}"${where ? ' ' + where : ''}`, params);
            total = cntRes.rows[0].cnt;
        } catch (e) { /* ignore count errors */ }
        return res.json({ table: t, rows: rowsRes.rows, rowCount: rowsRes.rowCount, total });
    } catch (e) { console.error('admin table rows error', e); return res.status(500).json({ error: String(e) }); }
});

// Admin: run a single SELECT SQL statement (read-only)
app.post('/api/admin/db/query', requireAdmin, async (req, res) => {
    try {
        const { sql } = req.body || {};
        if (!sql) return res.status(400).json({ error: 'Missing sql' });
        const trimmed = String(sql).trim();
        if (!/^select\s+/i.test(trimmed)) return res.status(400).json({ error: 'Only SELECT queries are allowed' });
        if (/;/.test(trimmed.replace(/\s+/g, ' ')) && !/;\s*\z/.test(trimmed)) return res.status(400).json({ error: 'Multiple statements are not allowed' });
        try {
            const result = await pool.query(trimmed);
            return res.json({ rows: result.rows, rowCount: result.rowCount });
        } catch (e) {
            console.error('admin db query error', e);
            return res.status(500).json({ error: String(e.message || e) });
        }
    } catch (e) { console.error('admin db query top error', e); return res.status(500).json({ error: String(e) }); }
});

// Switch the application's data DB to an external target and create required tables there (admin only)
app.post('/api/admin/switch-db', requireAdmin, async (req, res) => {
    try {
        const { dbType, dbHost, dbPort, dbUser, dbPassword, dbName, prefix } = req.body || {};
        if (!dbType || !dbHost || !dbPort || !dbUser || !dbName) return res.status(400).json({ ok: false, error: 'Missing parameters' });
        const cfg = { type: dbType, host: dbHost, port: dbPort, user: dbUser, password: dbPassword, database: dbName };
        // Create tables in target
        const pfx = prefix || 'dqai_';
        try {
            await createAppTablesInTarget(cfg, pfx);
        } catch (e) {
            console.error('Failed to create tables in target DB', e);
            return res.status(500).json({ ok: false, error: String(e.message || e) });
        }

        // Generate RAG schemas from the new DB and save into local rag_schemas and optional Chroma
        try {
            const gen = await generateRagFromTarget(cfg, pfx);
            // Persist the target DB settings to local .env so execute_sql uses them
            const envPath = path.resolve(process.cwd(), '.env');
            const map = { DB_USER: dbUser, DB_HOST: dbHost, DB_NAME: dbName, DB_PORT: String(dbPort), DB_PASSWORD: dbPassword, DB_PREFIX: pfx, DB_TYPE: dbType };
            const out = Object.entries(map).map(([k, v]) => `${k}=${v}`).join('\n');
            try { await fs.promises.writeFile(envPath, out, 'utf8'); } catch (e) { console.error('Failed to write .env', e); }
            try {
                const localPath = path.resolve(process.cwd(), '.env.local');
                await fs.promises.writeFile(localPath, out, 'utf8');
            } catch (e) { console.error('Failed to write .env.local', e); }

            return res.json({ ok: true, ragGenerated: gen.processed || 0 });
        } catch (e) {
            console.error('RAG generation failed', e);
            return res.status(500).json({ ok: false, error: String(e) });
        }
    } catch (e) { console.error('switch-db error', e); res.status(500).json({ ok: false, error: String(e) }); }
});

// SMTP/POP settings endpoints (stored in settings table under key 'smtp')
app.get('/api/admin/smtp', requireAdmin, async (req, res) => {
    try {
        const businessId = req.session?.businessId || null;
        const r = await pool.query("SELECT value FROM ${tables.SETTINGS} WHERE key = 'smtp' AND business_id = $1", [businessId]);
        if (r.rows.length === 0) return res.json(null);
        return res.json(r.rows[0].value);
    } catch (e) { console.error('Failed to get smtp settings', e); res.status(500).json({ error: String(e) }); }
});

app.post('/api/admin/smtp', requireAdmin, async (req, res) => {
    try {
        const businessId = req.session?.businessId || null;
        const payload = req.body || {};
        await pool.query("INSERT INTO ${tables.SETTINGS} (key, value, business_id) VALUES ('smtp',$1,$2) ON CONFLICT (key, business_id) DO UPDATE SET value = $1", [payload, businessId]);
        res.json({ ok: true });
    } catch (e) { console.error('Failed to save smtp settings', e); res.status(500).json({ ok: false, error: String(e) }); }
});

// Test SMTP send (admin only)
app.post('/api/admin/test-smtp', requireAdmin, async (req, res) => {
    try {
        const { to, subject, text } = req.body || {};
        if (!to) return res.status(400).json({ ok: false, error: 'Missing to' });
        // load smtp settings
        const businessId = req.session?.businessId || null;
        const sres = await pool.query("SELECT value FROM ${tables.SETTINGS} WHERE key = 'smtp' AND business_id = $1", [businessId]);
        const smtp = sres.rows[0] ? sres.rows[0].value : null;
        if (!smtp) return res.status(400).json({ ok: false, error: 'SMTP not configured' });
        // dynamic import nodemailer
        try {
            const nm = await import('nodemailer');
            const transporter = nm.createTransport(smtp);
            await transporter.sendMail({ from: smtp.from || smtp.user || 'no-reply@example.com', to, subject: subject || 'Test', text: text || 'Test message' });
            return res.json({ ok: true });
        } catch (e) {
            console.error('Failed to send test smtp', e);
            return res.status(500).json({ ok: false, error: String(e.message || e) });
        }
    } catch (e) { console.error('test-smtp error', e); res.status(500).json({ ok: false, error: String(e) }); }
});

// Password reset: request token
app.post('/auth/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ ok: false, error: 'Missing email' });
        const ures = await pool.query(`SELECT id, email, first_name FROM ${tables.USERS} WHERE email = $1`, [email]);
        if (ures.rows.length === 0) return res.status(404).json({ ok: false, error: 'User not found' });
        const user = ures.rows[0];
        // ensure password_resets table exists
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.PASSWORD_RESETS} (user_id INTEGER, token TEXT PRIMARY KEY, expires_at TIMESTAMP)`);
        const token = crypto.randomBytes(24).toString('hex');
        const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        await pool.query(`INSERT INTO ${tables.PASSWORD_RESETS} (user_id, token, expires_at) VALUES ($1,$2,$3)`, [user.id, token, expires]);
        // load smtp
        const sres = await pool.query("SELECT value FROM ${tables.SETTINGS} WHERE key = 'smtp'");
        const smtp = sres.rows[0] ? sres.rows[0].value : null;
        if (!smtp) return res.status(400).json({ ok: false, error: 'SMTP not configured' });
        const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontend.replace(/\/$/, '')}/reset-password?token=${token}`;
        try {
            const nm = await import('nodemailer');
            const transporter = nm.createTransport(smtp);
            const mailText = `Hello ${user.first_name || ''},\n\nYou requested a password reset. Click the link to reset your password: ${resetUrl}\n\nIf you didn't request this, ignore.`;
            await transporter.sendMail({ from: smtp.from || smtp.user || 'no-reply@example.com', to: user.email, subject: 'Password Reset', text: mailText });
        } catch (e) { console.error('Failed to send reset email', e); }
        return res.json({ ok: true });
    } catch (e) { console.error('request-password-reset error', e); res.status(500).json({ ok: false, error: String(e) }); }
});

// Password reset: perform reset
app.post('/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body || {};
        if (!token || !newPassword) return res.status(400).json({ ok: false, error: 'Missing token or newPassword' });
        const tres = await pool.query(`SELECT user_id, expires_at FROM ${tables.PASSWORD_RESETS} WHERE token = $1`, [token]);
        if (tres.rows.length === 0) return res.status(400).json({ ok: false, error: 'Invalid token' });
        const row = tres.rows[0];
        if (new Date(row.expires_at) < new Date()) return res.status(400).json({ ok: false, error: 'Token expired' });
        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query(`UPDATE ${tables.USERS} SET password = $1 WHERE id = $2`, [hash, row.user_id]);
        await pool.query(`DELETE FROM ${tables.PASSWORD_RESETS} WHERE token = $1`, [token]);
        return res.json({ ok: true });
    } catch (e) { console.error('reset-password error', e); res.status(500).json({ ok: false, error: String(e) }); }
});

// Admin: generic settings store (key/value JSON)
app.get('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        const businessId = req.session?.businessId || null;
        // Query for business-specific settings first, then fallback to NULL (global) settings
        // COALESCE picks business settings if they exist, otherwise global settings
        const result = await pool.query(`
            SELECT DISTINCT ON (key) key, value FROM ${tables.SETTINGS} 
            WHERE business_id = $1 OR business_id IS NULL
            ORDER BY key, business_id DESC NULLS LAST
        `, [businessId]);
        const out = {};
        for (const r of result.rows) {
            // The value is stored as JSONB, so we need to extract the actual value
            // r.value will be a JSONB object/string - parse it
            try {
                if (typeof r.value === 'string') {
                    out[r.key] = JSON.parse(r.value);
                } else if (typeof r.value === 'object') {
                    // JSONB already deserialized to object
                    out[r.key] = r.value;
                } else {
                    out[r.key] = r.value;
                }
            } catch (e) {
                out[r.key] = r.value;
            }
        }
        res.json(out);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch settings' }); }
});

app.post('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        const businessId = req.session?.businessId || null;
        const payload = req.body || {};
        for (const [k, v] of Object.entries(payload)) {
            // Convert the JS value to a JSON string and cast to jsonb on the SQL side.
            // Using `$2::jsonb` avoids PostgreSQL's "polymorphic type unknown" error
            // which can occur when calling functions like to_jsonb($2) with an unknown param type.
            const jsonString = JSON.stringify(v);
            await pool.query(
                `INSERT INTO ${tables.SETTINGS} (key, value, business_id) VALUES ($1, $2::jsonb, $3) ON CONFLICT (key, business_id) DO UPDATE SET value = $2::jsonb`,
                [k, jsonString, businessId]
            );
        }
        res.json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save settings' }); }
});

// Admin: detect local Ollama models (server-side probe to avoid CORS issues)
app.get('/api/admin/detect-ollama', requireAdmin, async (req, res) => {
    // Only probe the supported Ollama endpoints for listing models and version
    const hosts = ['127.0.0.1', 'localhost', '::1'];
    const ports = [11434];
    const paths = ['/api/tags', '/api/version'];
    try {
        for (const h of hosts) {
            for (const p of ports) {
                for (const pa of paths) {
                    const url = `http://${h}:${p}${pa}`;
                    try {
                        const r = await fetch(url, { method: 'GET' });
                        if (!r.ok) continue;
                        const j = await r.json();
                        // /api/tags returns { models: [...] }
                        if (pa === '/api/tags' && j && Array.isArray(j.models) && j.models.length) {
                            const found = j.models.map(m => m.name || m.id || String(m));
                            return res.json({ ok: true, models: found, url });
                        }
                        // /api/version returns version info; return if present
                        if (pa === '/api/version' && j && (j.version || j.build)) {
                            return res.json({ ok: true, version: j, url });
                        }
                    } catch (e) {
                        // try next
                    }
                }
            }
        }
        return res.status(404).json({ ok: false, models: [] });
    } catch (e) {
        console.error('detect-ollama error', e);
        return res.status(500).json({ ok: false, error: String(e) });
    }
});

// Admin: test DB connection for provided config (used by Settings "Test Connection")
app.post('/api/admin/test-db', requireAdmin, async (req, res) => {
    try {
        const { dbHost, dbPort, dbUser, dbPassword, dbName } = req.body || {};
        if (!dbHost || !dbPort || !dbUser || !dbName) return res.status(400).json({ ok: false, error: 'Missing parameters (dbHost, dbPort, dbUser, dbName required)' });
        const tempPool = new Pool({ host: dbHost, port: Number(dbPort), user: dbUser, password: dbPassword, database: dbName, connectionTimeoutMillis: 5000 });
        try {
            await tempPool.query('SELECT 1');
            // Generate RAG schemas (indexes/cols/sample rows) for this target DB
            try {
                const tablesRes = await tempPool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
                for (const r of tablesRes.rows) {
                    const tname = r.table_name;
                    try {
                        const colsRes = await tempPool.query('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1', [tname]);
                        const schema = colsRes.rows;
                        let sample = [];
                        try {
                            const sres = await tempPool.query(`SELECT * FROM "${tname}" LIMIT 5`);
                            sample = truncateSampleRows(sres.rows);
                        } catch (e) {
                            // sampling failure is non-fatal
                            sample = [];
                        }
                        await pool.query(`INSERT INTO ${tables.RAG_SCHEMAS} (table_name, schema, sample_rows) VALUES ($1,$2,$3) ON CONFLICT (table_name) DO UPDATE SET schema = $2, sample_rows = $3, generated_at = NOW()`, [tname, JSON.stringify(schema), JSON.stringify(sample)]);
                    } catch (e) {
                        console.error('Failed processing table', tname, e);
                    }
                }
            } catch (e) {
                console.error('Failed to generate RAG schemas during test-db:', e);
            }
            await tempPool.end();
            return res.json({ ok: true, generated: true });
        } catch (err) {
            await tempPool.end().catch(() => { });
            console.error('test-db connection error', err);
            return res.status(500).json({ ok: false, error: String(err.message || err) });
        }
    } catch (e) { console.error('test-db error', e); return res.status(500).json({ ok: false, error: String(e) }); }
});

// Public test DB endpoint (no auth) - useful for testing DB connectivity from Settings form
app.post('/api/test-db', async (req, res) => {
    try {
        const { dbHost, dbPort, dbUser, dbPassword, dbName } = req.body || {};
        if (!dbHost || !dbPort || !dbUser || !dbName) return res.status(400).json({ ok: false, error: 'Missing parameters (dbHost, dbPort, dbUser, dbName required)' });
        const tempPool = new Pool({ host: dbHost, port: Number(dbPort), user: dbUser, password: dbPassword, database: dbName, connectionTimeoutMillis: 3000 });
        try {
            await tempPool.query('SELECT 1');
            await tempPool.end();
            return res.json({ ok: true });
        } catch (err) {
            await tempPool.end().catch(() => { });
            return res.status(500).json({ ok: false, error: String(err.message || err) });
        }
    } catch (e) { console.error('test-db public error', e); return res.status(500).json({ ok: false, error: String(e) }); }
});

// Admin: manual seed roles & permissions endpoint (idempotent)
app.post('/api/admin/seed-roles', requireAdmin, async (req, res) => {
    try {
        // Re-run seeding logic from initDb (simple approach)
        const perms = [
            ['manage_users', 'Create, update and delete users'],
            ['manage_roles', 'Manage roles and permissions'],
            ['manage_settings', 'Update system settings and LLM providers'],
            ['edit_forms', 'Create and edit form definitions'],
            ['submit_reports', 'Submit reports/responses'],
            ['view_reports', 'View reports and dashboards'],
            ['manage_llm', 'Manage LLM providers and RAG settings']
        ];
        for (const [name, desc] of perms) {
            await pool.query(`INSERT INTO ${tables.PERMISSIONS} (name, description) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING`, [name, desc]);
        }
        const roles = [
            ['Admin', 'Full system administrator'],
            ['Form Builder', 'Design and publish forms'],
            ['Data Collector', 'Collect and submit data in the field'],
            ['Reviewer', 'Review submitted reports and provide feedback'],
            ['Viewer', 'Read-only access to reports and dashboards']
        ];
        for (const [name, desc] of roles) {
            await pool.query(`INSERT INTO ${tables.ROLES} (name, description) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING`, [name, desc]);
        }
        const rolePermMap = {
            'Admin': ['manage_users', 'manage_roles', 'manage_settings', 'edit_forms', 'submit_reports', 'view_reports', 'manage_llm'],
            'Form Builder': ['edit_forms', 'view_reports'],
            'Data Collector': ['submit_reports', 'view_reports'],
            'Reviewer': ['view_reports', 'manage_llm'],
            'Viewer': ['view_reports']
        };
        for (const [roleName, permNames] of Object.entries(rolePermMap)) {
            const r = await pool.query(`SELECT id FROM ${tables.ROLES} WHERE name = $1`, [roleName]);
            if (r.rows.length === 0) continue;
            const roleId = r.rows[0].id;
            for (const pname of permNames) {
                const p = await pool.query(`SELECT id FROM ${tables.PERMISSIONS} WHERE name = $1`, [pname]);
                if (p.rows.length === 0) continue;
                const permId = p.rows[0].id;
                await pool.query(`INSERT INTO ${tables.ROLE_PERMISSIONS} (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [roleId, permId]);
            }
        }
        // Ensure default admin user is assigned Admin role
        try {
            const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
            const ures = await pool.query(`SELECT id FROM ${tables.USERS} WHERE email = $1`, [adminEmail]);
            const rres = await pool.query("SELECT id FROM ${tables.ROLES} WHERE name = 'Admin'");
            if (ures.rows.length > 0 && rres.rows.length > 0) {
                const userId = ures.rows[0].id;
                const roleId = rres.rows[0].id;
                await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, roleId]);
            }
        } catch (e) { console.error('Failed to assign Admin role during seed-roles:', e); }
        res.json({ ok: true });
    } catch (e) { console.error('seed-roles error', e); res.status(500).json({ ok: false, error: String(e) }); }
});

// Admin: CRUD for llm_providers
app.get('/api/admin/llm_providers', requireAdmin, async (req, res) => {
    try {
        const r = await pool.query(`SELECT * FROM ${tables.LLM_PROVIDERS} ORDER BY priority ASC`);
        res.json(r.rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to list llm providers' }); }
});

app.post('/api/admin/llm_providers', requireAdmin, async (req, res) => {
    try {
        const { id, provider_id, name, model, config, priority } = req.body;
        if (id) {
            const r = await pool.query(`UPDATE ${tables.LLM_PROVIDERS} SET provider_id=$1, name=$2, model=$3, config=$4, priority=$5 WHERE id=$6 RETURNING *`, [provider_id, name, model, config || {}, priority || 0, id]);
            return res.json(r.rows[0]);
        }
        const r = await pool.query(`INSERT INTO ${tables.LLM_PROVIDERS} (provider_id, name, model, config, priority) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [provider_id, name, model, config || {}, priority || 0]);
        res.json(r.rows[0]);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save provider' }); }
});

// Public (dev) LLM providers endpoints - enabled only when allowPublicAdmin is true
if (allowPublicAdmin) {
    app.get('/api/llm_providers', async (req, res) => {
        try {
            const r = await pool.query(`SELECT * FROM ${tables.LLM_PROVIDERS} ORDER BY priority ASC`);
            return res.json(r.rows);
        } catch (e) { console.error('public llm_providers list failed', e); return res.status(500).json({ error: 'Failed to list llm providers' }); }
    });

    app.post('/api/llm_providers', async (req, res) => {
        try {
            const { id, provider_id, name, model, config, priority } = req.body;
            if (id) {
                const r = await pool.query(`UPDATE ${tables.LLM_PROVIDERS} SET provider_id=$1, name=$2, model=$3, config=$4, priority=$5 WHERE id=$6 RETURNING *`, [provider_id, name, model, config || {}, priority || 0, id]);
                return res.json(r.rows[0]);
            }
            const r = await pool.query(`INSERT INTO ${tables.LLM_PROVIDERS} (provider_id, name, model, config, priority) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [provider_id, name, model, config || {}, priority || 0]);
            return res.json(r.rows[0]);
        } catch (e) { console.error('public llm_providers save failed', e); return res.status(500).json({ error: 'Failed to save provider' }); }
    });

    // Public (dev) RAG schemas listing
    app.get('/api/rag_schemas', async (req, res) => {
        try {
            const r = await pool.query(`SELECT * FROM ${tables.RAG_SCHEMAS} ORDER BY id`);
            return res.json(r.rows);
        } catch (e) { console.error('public rag_schemas list failed', e); return res.status(500).json({ error: 'Failed to list rag schemas' }); }
    });

    // Public detect-ollama endpoint (dev only)
    app.get('/api/detect-ollama', async (req, res) => {
        // Only probe the supported Ollama endpoints on localhost
        const hosts = ['127.0.0.1', 'localhost', '::1'];
        const ports = [11434];
        const paths = ['/api/tags', '/api/version'];
        try {
            for (const h of hosts) {
                for (const p of ports) {
                    for (const pa of paths) {
                        const url = `http://${h}:${p}${pa}`;
                        try {
                            const r = await fetch(url, { method: 'GET' });
                            if (!r.ok) continue;
                            const j = await r.json();
                            if (pa === '/api/tags' && j && Array.isArray(j.models) && j.models.length) {
                                const found = j.models.map(m => m.name || m.id || String(m));
                                return res.json({ ok: true, models: found, url });
                            }
                            if (pa === '/api/version' && j && (j.version || j.build)) {
                                return res.json({ ok: true, version: j, url });
                            }
                        } catch (e) { /* try next */ }
                    }
                }
            }
            return res.status(404).json({ ok: false, models: [] });
        } catch (e) { console.error('public detect-ollama error', e); return res.status(500).json({ ok: false, error: String(e) }); }
    });
}

// Admin: CRUD for RAG schemas (list/create/update/delete)
app.get('/api/admin/rag_schemas', requireAdmin, async (req, res) => {
    try {
        const r = await pool.query(`SELECT * FROM ${tables.RAG_SCHEMAS} ORDER BY id`);
        res.json(r.rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to list rag schemas' }); }
});

app.post('/api/admin/rag_schemas', requireAdmin, async (req, res) => {
    try {
        const { id, table_name, schema, sample_rows, category, business_rules } = req.body || {};
        if (!table_name) return res.status(400).json({ error: 'Missing table_name' });
        if (!business_rules || !String(business_rules).trim()) return res.status(400).json({ error: 'Business rules (natural language) are required for every RAG record' });
        const schemaJson = schema ? JSON.stringify(schema) : JSON.stringify([]);
        const processedSamples = Array.isArray(sample_rows) ? truncateSampleRows(sample_rows) : [];
        const sampleJson = JSON.stringify(processedSamples || []);
        const cat = category ? String(category) : null;
        const br = business_rules ? String(business_rules) : null;
        let saved;
        if (id) {
            const r = await pool.query(`UPDATE ${tables.RAG_SCHEMAS} SET table_name=$1, schema=$2, sample_rows=$3, category=$4, business_rules=$5, generated_at = NOW() WHERE id=$6 RETURNING *`, [table_name, schemaJson, sampleJson, cat, br, id]);
            saved = r.rows[0];
        } else {
            // Compute a minimal textual summary for the RAG record if not provided
            const computeSummary = () => {
                try {
                    const cols = (schema || []).map((c) => (c.column_name || c.name)).filter(Boolean);
                    const previewRows = (processedSamples || []).slice(0, 3).map((r) => {
                        try {
                            // join first few column values into a short string
                            const vals = cols.slice(0, 4).map(cn => `${cn}: ${String(r[cn] ?? '')}`);
                            return vals.join(' | ');
                        } catch (e) { return JSON.stringify(r).slice(0, 100); }
                    });
                    const colPart = cols.length ? `Columns: ${cols.slice(0, 8).join(', ')}` : '';
                    const samplePart = previewRows.length ? ` Sample: ${previewRows.join(' || ')}` : '';
                    return `${table_name}${colPart ? ' — ' + colPart : ''}${samplePart}`.slice(0, 800);
                } catch (e) { return `${table_name}`; }
            };
            const summaryText = computeSummary();
            const r = await pool.query(`INSERT INTO ${tables.RAG_SCHEMAS} (table_name, schema, sample_rows, category, business_rules, summary_text) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (table_name) DO UPDATE SET schema = $2, sample_rows = $3, category = $4, business_rules = $5, summary_text = $6, generated_at = NOW() RETURNING *`, [table_name, schemaJson, sampleJson, cat, br, summaryText]);
            saved = r.rows[0];
        }

        // If configured, push samples to Chroma and record ids
        if (process.env.CHROMA_API_URL && Array.isArray(processedSamples) && processedSamples.length) {
            const chromaUrl = (process.env.CHROMA_API_URL || '').replace(/\/$/, '');
            try {
                // cleanup existing chroma ids for this table
                const existing = await pool.query(`SELECT chroma_id FROM ${tables.RAG_CHROMA_IDS} WHERE rag_table_name = $1`, [table_name]);
                for (const row of existing.rows) {
                    try { await fetch(chromaUrl + '/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.chroma_id }) }); } catch (e) { /* ignore */ }
                }
                await pool.query(`DELETE FROM ${tables.RAG_CHROMA_IDS} WHERE rag_table_name = $1`, [table_name]);

                for (let i = 0; i < processedSamples.length; i++) {
                    const rrow = processedSamples[i];
                    const chromaId = `${table_name}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
                    try {
                        await fetch(chromaUrl + '/index', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: chromaId, text: JSON.stringify(rrow), metadata: { table: table_name, rag_id: saved.id, rowIndex: i } }) });
                        try { await pool.query(`INSERT INTO ${tables.RAG_CHROMA_IDS} (rag_table_name, chroma_id) VALUES ($1,$2)`, [table_name, chromaId]); } catch (e) { /* ignore */ }
                    } catch (e) { console.error('Failed to push sample to Chroma', e); }
                }
            } catch (e) { console.error('Chroma push error', e); }
        }

        res.json(saved);
    } catch (e) { console.error('Failed to save rag schema', e); res.status(500).json({ error: 'Failed to save rag schema' }); }
});

app.delete('/api/admin/rag_schemas/:id', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const r = await pool.query(`SELECT table_name FROM ${tables.RAG_SCHEMAS} WHERE id = $1`, [id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const tableName = r.rows[0].table_name;
        // delete DB record
        await pool.query(`DELETE FROM ${tables.RAG_SCHEMAS} WHERE id = $1`, [id]);
        // delete indexed chroma items if present
        if (process.env.CHROMA_API_URL) {
            const chromaUrl = (process.env.CHROMA_API_URL || '').replace(/\/$/, '');
            const ids = await pool.query(`SELECT chroma_id FROM ${tables.RAG_CHROMA_IDS} WHERE rag_table_name = $1`, [tableName]);
            for (const row of ids.rows) {
                try { await fetch(chromaUrl + '/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.chroma_id }) }); } catch (e) { /* ignore */ }
            }
            await pool.query(`DELETE FROM ${tables.RAG_CHROMA_IDS} WHERE rag_table_name = $1`, [tableName]);
        }
        res.json({ ok: true });
    } catch (e) { console.error('Failed to delete rag schema', e); res.status(500).json({ error: 'Failed to delete rag schema' }); }
});

// Admin: CRUD for indicators (computed metrics built from answers or SQL)
app.get('/api/admin/indicators', requireAdmin, async (req, res) => {
    try {
        const r = await pool.query(`SELECT * FROM ${tables.INDICATORS} ORDER BY id DESC`);
        res.json(r.rows);
    } catch (e) { console.error('Failed to list indicators', e); res.status(500).json({ error: 'Failed to list indicators' }); }
});

app.post('/api/admin/indicators', requireAdmin, async (req, res) => {
    try {
        const { id, name, title, subtitle, program_id, activity_id, formula, formula_type, indicator_level, unit_of_measurement, show_on_map, notes, status, category } = req.body || {};
        // allow either name or title to be provided
        const finalName = name || title || null;
        if (!finalName) return res.status(400).json({ error: 'Missing name/title' });
        // Ensure category column exists (idempotent safe migration)
        try { await pool.query("ALTER TABLE ${tables.INDICATORS} ADD COLUMN IF NOT EXISTS category TEXT"); } catch (e) { /* ignore migration errors */ }
        if (id) {
            const r = await pool.query(
                `UPDATE ${tables.INDICATORS} SET name=$1, title=$2, subtitle=$3, program_id=$4, activity_id=$5, formula=$6, formula_type=$7, indicator_level=$8, unit_of_measurement=$9, show_on_map=$10, notes=$11, status=$12, category=$13 WHERE id=$14 RETURNING *`,
                [finalName, title || null, subtitle || null, program_id || null, activity_id || null, formula || null, formula_type || null, indicator_level || null, unit_of_measurement || null, (show_on_map === undefined ? false : show_on_map), notes ? (typeof notes === 'object' ? JSON.stringify(notes) : notes) : null, status || null, category || null, id]
            );
            return res.json(r.rows[0]);
        }
        const createdBy = (req.session && req.session.userId) ? req.session.userId : null;
        const r = await pool.query(
            `INSERT INTO ${tables.INDICATORS} (name, title, subtitle, program_id, activity_id, formula, formula_type, indicator_level, unit_of_measurement, show_on_map, notes, status, category, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [finalName, title || null, subtitle || null, program_id || null, activity_id || null, formula || null, formula_type || null, indicator_level || null, unit_of_measurement || null, (show_on_map === undefined ? false : show_on_map), notes ? (typeof notes === 'object' ? JSON.stringify(notes) : notes) : null, status || null, category || null, createdBy]
        );
        res.json(r.rows[0]);
    } catch (e) { console.error('Failed to save indicator', e); res.status(500).json({ error: 'Failed to save indicator' }); }
});

app.delete('/api/admin/indicators/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query(`DELETE FROM ${tables.INDICATORS} WHERE id = $1`, [req.params.id]);
        res.json({ ok: true });
    } catch (e) { console.error('Failed to delete indicator', e); res.status(500).json({ error: 'Failed to delete indicator' }); }
});

// Public: list indicators
app.get('/api/indicators', async (req, res) => {
    try {
        const r = await pool.query(`SELECT * FROM ${tables.INDICATORS} ORDER BY id DESC`);
        res.json(r.rows);
    } catch (e) { console.error('Failed to list indicators', e); res.status(500).json({ error: 'Failed to list indicators' }); }
});

// Public: compute an indicator value. Supports:
// - SQL formulas prefixed with 'sql:' (only read-only SELECT allowed)
// - sum of answer question ids (formula_type 'sum_answers' or comma-separated qids)
app.get('/api/indicators/compute', async (req, res) => {
    try {
        const indicatorId = Number(req.query.indicatorId || req.query.id);
        const facilityId = req.query.facilityId ? Number(req.query.facilityId) : null;
        if (!indicatorId) return res.status(400).json({ error: 'Missing indicatorId' });
        const ir = await pool.query(`SELECT * FROM ${tables.INDICATORS} WHERE id = $1`, [indicatorId]);
        if (ir.rows.length === 0) return res.status(404).json({ error: 'Indicator not found' });
        const ind = ir.rows[0];
        const formula = ind.formula || '';
        const ftype = (ind.formula_type || '').toString().toLowerCase();

        // Helper: replace simple {placeholders} in SQL with positional $1..$n params from context
        const prepareSqlWithContext = (rawSql, context) => {
            const values = [];
            let idx = 1;
            const text = String(rawSql).replace(/\{([a-zA-Z0-9_]+)\}/g, (m, key) => {
                const k = String(key || '').toLowerCase();
                if (context[k] !== undefined && context[k] !== null) {
                    values.push(context[k]);
                    const p = '$' + (idx++);
                    return p;
                }
                // leave as-is if not present in context
                return m;
            });
            return { text, values };
        };

        // SQL mode: support placeholder substitution like {selected_facility_id} or {selected_facility}
        // Accept formulas that are explicitly prefixed with 'sql:' OR where the saved formula_type is 'sql'
        // or where the formula text itself starts with SELECT (frontend may save raw SELECT without prefix).
        const isSqlMode = String(formula || '').toLowerCase().startsWith('sql:') || (ftype === 'sql') || String((formula || '')).trim().toLowerCase().startsWith('select');
        if (isSqlMode) {
            const rawSql = String(formula).toLowerCase().startsWith('sql:') ? String(formula).slice(4).trim() : String(formula).trim();
            const sql = rawSql;
            if (!/^select\s+/i.test(sql)) return res.status(400).json({ error: 'Only SELECT SQL allowed for indicator SQL formulas' });
            try {
                // context keys are lowercase
                const context = {
                    selected_facility_id: facilityId,
                    selected_facility: facilityId,
                    facilityid: facilityId,
                    facility_id: facilityId,
                    selected_state: (req.query.selected_state || req.query.state || null),
                    selected_lga: (req.query.selected_lga || req.query.lga || null),
                    selected_user_id: (req.query.selected_user_id || req.query.userId || null)
                };
                const { text, values } = prepareSqlWithContext(sql, context);
                // If placeholders were not used but facilityId present and SQL uses $1, pass it as param for compatibility
                let execValues = values;
                if (values.length === 0 && facilityId) {
                    // if SQL expects positional $1 replace we pass facilityId, otherwise run without params
                    if (/\$1/.test(sql)) execValues = [facilityId];
                }
                console.log(`[indicator/compute] Executing SQL for indicator ${indicatorId}, facility ${facilityId}:`, text, 'params=', execValues);
                const result = await pool.query(text, execValues);
                return res.json({ rows: result.rows, rowCount: result.rowCount });
            } catch (e) { console.error('Indicator SQL execution failed', e); return res.status(500).json({ error: String(e.message || e) }); }
        }

        // Sum answers mode: formula is comma-separated question ids like 'q1,q2' or 'q_q1,q_q2'
        const qids = (formula || '').split(',').map(s => String(s || '').trim()).filter(Boolean);
        if (ftype === 'sum_answers' || qids.length > 0) {
            try {
                // Build query to sum numeric answer_value across ${tables.ANSWERS} for specified question_ids.
                // We assume answer_value contains either a numeric JSON value or a bare number.
                const params = [];
                let where = `question_id = ANY($1::text[])`;
                params.push(qids);
                if (facilityId) {
                    where += ' AND facility_id = $2';
                    params.push(facilityId);
                }
                const q = `SELECT question_id, SUM( (CASE WHEN answer_value ~ '^[+-]?(?:\\d+\\.?\\d*|\\.\\d+)$' THEN (answer_value::numeric) ELSE NULL END) ) as sum_value FROM ${tables.ANSWERS} WHERE ${where} GROUP BY question_id`;
                console.log(`[indicator/compute] Executing sum_answers for indicator ${indicatorId}, facility ${facilityId}:`, q, 'params=', params);
                const r = await pool.query(q, params);
                // aggregate across questions
                let total = 0;
                for (const row of r.rows) { total += Number(row.sum_value || 0); }
                return res.json({ indicatorId, facilityId, value: total, details: r.rows });
            } catch (e) { console.error('Failed to compute sum_answers', e); return res.status(500).json({ error: String(e.message || e) }); }
        }

        return res.status(400).json({ error: 'Unsupported indicator formula or empty formula' });
    } catch (e) { console.error('indicators/compute error', e); res.status(500).json({ error: String(e) }); }
});

// Bulk compute indicators for multiple facilities in one call
app.post('/api/indicators/compute_bulk', async (req, res) => {
    try {
        const { indicatorIds, facilityIds } = req.body || {};
        if (!Array.isArray(indicatorIds) || indicatorIds.length === 0) return res.status(400).json({ error: 'Missing indicatorIds' });
        if (!Array.isArray(facilityIds) || facilityIds.length === 0) return res.status(400).json({ error: 'Missing facilityIds' });

        // Fetch indicators
        const ir = await pool.query(`SELECT * FROM ${tables.INDICATORS} WHERE id = ANY($1::int[])`, [indicatorIds]);
        const indicators = ir.rows || [];

        const out = {};

        for (const ind of indicators) {
            const formula = ind.formula || '';
            const ftype = (ind.formula_type || '').toString().toLowerCase();
            const iid = ind.id;
            out[iid] = { indicator: ind, results: {} };

            // SQL mode: run per-facility (support {placeholders} substitution)
                const isSqlModeBulk = String(formula || '').toLowerCase().startsWith('sql:') || (ftype === 'sql') || String((formula || '')).trim().toLowerCase().startsWith('select');
            if (isSqlModeBulk) {
                const rawSql = String(formula).toLowerCase().startsWith('sql:') ? String(formula).slice(4).trim() : String(formula).trim();
                const sql = rawSql;
                if (!/^select\s+/i.test(sql)) {
                    out[iid].error = 'Only SELECT SQL allowed for indicator SQL formulas';
                    continue;
                }
                // Prepare function to replace placeholders for each facility id
                const prepareSqlWithContext = (rawSql, context) => {
                    const values = [];
                    let idx = 1;
                    const text = String(rawSql).replace(/\{([a-zA-Z0-9_]+)\}/g, (m, key) => {
                        const k = String(key || '').toLowerCase();
                        if (context[k] !== undefined && context[k] !== null) {
                            values.push(context[k]);
                            const p = '$' + (idx++);
                            return p;
                        }
                        return m;
                    });
                    return { text, values };
                };

                for (const fid of facilityIds) {
                    try {
                            const context = { selected_facility_id: fid, selected_facility: fid, facilityid: fid, facility_id: fid, selected_state: (req.body && (req.body.selected_state || req.body.state)) || null, selected_lga: (req.body && (req.body.selected_lga || req.body.lga)) || null, selected_user_id: (req.body && (req.body.selected_user_id || req.body.userId)) || null };
                        const { text, values } = prepareSqlWithContext(sql, context);
                        let execValues = values;
                        if (values.length === 0) {
                            if (/\$1/.test(sql)) execValues = [fid];
                        }
                        console.log(`[indicator/compute_bulk] Executing SQL for indicator ${iid}, facility ${fid}:`, text, 'params=', execValues);
                        const result = await pool.query(text, execValues);
                        out[iid].results[fid] = { rows: result.rows, rowCount: result.rowCount };
                    } catch (e) {
                        out[iid].results[fid] = { error: String(e.message || e) };
                    }
                }
                continue;
            }

            // Sum answers / question id list mode: aggregate in one query for performance
            const qids = (formula || '').split(',').map(s => String(s || '').trim()).filter(Boolean);
            if (ftype === 'sum_answers' || qids.length > 0) {
                try {
                    const params = [qids, facilityIds];
                    const q = `SELECT facility_id, SUM( (CASE WHEN answer_value ~ '^[+-]?(?:\\d+\\.?\\d*|\\.\\d+)$' THEN (answer_value::numeric) ELSE NULL END) ) as sum_value FROM ${tables.ANSWERS} WHERE question_id = ANY($1::text[]) AND facility_id = ANY($2::int[]) GROUP BY facility_id`;
                    console.log(`[indicator/compute_bulk] Executing sum_answers for indicator ${iid} across facilities:`, q, 'params=', params);
                    const r = await pool.query(q, params);
                    // map by facility
                    const sums = {};
                    for (const row of r.rows) { sums[String(row.facility_id)] = Number(row.sum_value || 0); }
                    for (const fid of facilityIds) { out[iid].results[fid] = { value: Number(sums[String(fid)] || 0) }; }
                } catch (e) {
                    out[iid].error = String(e.message || e);
                }
                continue;
            }

            out[iid].error = 'Unsupported indicator formula or empty formula';
        }

        res.json({ ok: true, computed: out });
    } catch (e) { console.error('indicators/compute_bulk error', e); res.status(500).json({ error: String(e) }); }
});

// Admin: Datasets CRUD
app.get('/api/admin/datasets', requireAdmin, async (req, res) => {
    try {
        const businessId = req.session?.businessId || null;
        const userCheck = req.session?.userId ? (await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId])).rows[0] : null;
        const isSuperAdmin = userCheck && String(userCheck.role || '').toLowerCase().includes('super');
        const r = isSuperAdmin && !businessId 
            ? await pool.query(`SELECT * FROM ${tables.DATASETS} ORDER BY id DESC`)
            : await pool.query(`SELECT * FROM ${tables.DATASETS} WHERE business_id = $1 OR business_id IS NULL ORDER BY id DESC`, [businessId]);
        res.json(r.rows);
    } catch (e) { console.error('Failed to list datasets', e); res.status(500).json({ error: 'Failed to list datasets' }); }
});

app.get('/api/admin/datasets/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const businessId = req.session?.businessId || null;
        const userCheck = req.session?.userId ? (await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId])).rows[0] : null;
        const isSuperAdmin = userCheck && String(userCheck.role || '').toLowerCase().includes('super');
        const r = isSuperAdmin && !businessId 
            ? await pool.query(`SELECT * FROM ${tables.DATASETS} WHERE id = $1`, [id])
            : await pool.query(`SELECT * FROM ${tables.DATASETS} WHERE id = $1 AND (business_id = $2 OR business_id IS NULL)`, [id, businessId]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(r.rows[0]);
    } catch (e) { console.error('Failed to get dataset', e); res.status(500).json({ error: 'Failed to get dataset' }); }
});

app.post('/api/admin/datasets', requireAdmin, async (req, res) => {
    try {
        const { id, name, description, category, dataset_fields } = req.body || {};
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'Missing name' });
        // Normalize dataset_fields robustly: accept JSON string, comma-separated string, array of strings, array of objects,
        // or array of JSON-stringified objects (possibly double-encoded). Always produce an array of objects.
        let normalizedFields = dataset_fields;
        const tryParse = (v) => {
            try { return JSON.parse(v); } catch (e) { return undefined; }
        };
        try {
            if (typeof normalizedFields === 'string') {
                // Try JSON parse first (covers strings like '[{"name":"x"}]' or '"[{...}]"')
                const p = tryParse(normalizedFields);
                if (p !== undefined && (Array.isArray(p) || typeof p === 'object')) normalizedFields = p;
                else {
                    // Fallback: comma-separated names
                    normalizedFields = normalizedFields.split(',').map(s => ({ name: String(s || '').trim() })).filter(f => f.name);
                }
            }

            if (Array.isArray(normalizedFields)) {
                normalizedFields = normalizedFields.map(item => {
                    if (item === null || item === undefined) return null;
                    if (typeof item === 'object') return item;
                    if (typeof item === 'string') {
                        // Item might be a JSON-stringified object (possibly double-encoded), or a plain name
                        const p1 = tryParse(item);
                        if (p1 !== undefined) {
                            if (typeof p1 === 'object' && p1 !== null) return p1;
                            // p1 could be a string that itself contains JSON (double-encoded)
                            if (typeof p1 === 'string') {
                                const inner = tryParse(p1);
                                if (inner !== undefined && typeof inner === 'object') return inner;
                            }
                        }
                        // Try to unescape common escape sequences and parse again
                        const unescaped = item.replace(/\\"/g, '"').replace(/\"/g, '"');
                        const p2 = tryParse(unescaped);
                        if (p2 !== undefined && typeof p2 === 'object') return p2;
                        // If it looks like JSON but parsing failed, try trimming surrounding quotes and parse
                        const trimmed = item.trim();
                        if ((trimmed.startsWith('"{') && trimmed.endsWith('}"')) || (trimmed.startsWith('\'{') && trimmed.endsWith('}\''))) {
                            const stripped = trimmed.slice(1, -1);
                            const p3 = tryParse(stripped);
                            if (p3 !== undefined && typeof p3 === 'object') return p3;
                        }
                        // Finally, treat it as a simple name
                        return { name: String(item).trim() };
                    }
                    return null;
                }).filter(Boolean);
            } else {
                normalizedFields = [];
            }
        } catch (e) {
            normalizedFields = [];
        }

        // Debug preview to help diagnose malformed payloads
        try { console.debug('Saving dataset_fields preview (type, len):', typeof normalizedFields, Array.isArray(normalizedFields) ? normalizedFields.length : '-', JSON.stringify(normalizedFields).slice(0, 1000)); } catch (e) { /* ignore */ }

        try {
            // accept show_in_menu flag if provided
            const showInMenu = (req.body && typeof req.body.show_in_menu !== 'undefined') ? !!req.body.show_in_menu : false;
            if (id) {
                const businessId = req.session?.businessId || null;
                const userCheck = req.session?.userId ? (await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId])).rows[0] : null;
                const isSuperAdmin = userCheck && String(userCheck.role || '').toLowerCase().includes('super');
                if (isSuperAdmin && !businessId) {
                    const r = await pool.query(`UPDATE ${tables.DATASETS} SET name=$1, description=$2, category=$3, dataset_fields=$4, show_in_menu=$5 WHERE id=$6 RETURNING *`, [name, description || null, category || null, JSON.stringify(normalizedFields), showInMenu, id]);
                    return res.json(r.rows[0]);
                } else {
                    const r = await pool.query(`UPDATE ${tables.DATASETS} SET name=$1, description=$2, category=$3, dataset_fields=$4, show_in_menu=$5 WHERE id=$6 AND (business_id = $7 OR business_id IS NULL) RETURNING *`, [name, description || null, category || null, JSON.stringify(normalizedFields), showInMenu, id, businessId]);
                    if (r.rows.length === 0) return res.status(403).json({ error: 'Not authorized to update this dataset' });
                    return res.json(r.rows[0]);
                }
            }
            const createdBy = (req.session && req.session.userId) ? req.session.userId : null;
            const businessId = req.session?.businessId || null;
            const r = await pool.query(`INSERT INTO ${tables.DATASETS} (name, description, category, dataset_fields, show_in_menu, created_by, business_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [name, description || null, category || null, JSON.stringify(normalizedFields), showInMenu, createdBy, businessId]);
            res.json(r.rows[0]);
        } catch (dbErr) {
            console.error('Failed to save dataset, normalizedFields preview:', typeof normalizedFields, JSON.stringify(normalizedFields).slice(0, 1000));
            console.error('DB error when saving dataset:', dbErr && dbErr.message ? dbErr.message : dbErr);
            return res.status(500).json({ error: 'Failed to save dataset', details: String(dbErr && dbErr.message ? dbErr.message : dbErr) });
        }
    } catch (e) { console.error('Failed to save dataset', e); res.status(500).json({ error: 'Failed to save dataset' }); }
});

app.delete('/api/admin/datasets/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const businessId = req.session?.businessId || null;
        const userCheck = req.session?.userId ? (await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId])).rows[0] : null;
        const isSuperAdmin = userCheck && String(userCheck.role || '').toLowerCase().includes('super');
        
        if (isSuperAdmin && !businessId) {
            await pool.query(`DELETE FROM ${tables.DATASET_CONTENT} WHERE dataset_id = $1`, [id]);
            await pool.query(`DELETE FROM ${tables.DATASETS} WHERE id = $1`, [id]);
        } else {
            await pool.query(`DELETE FROM ${tables.DATASET_CONTENT} WHERE dataset_id = $1 AND (business_id = $2 OR business_id IS NULL)`, [id, businessId]);
            const result = await pool.query(`DELETE FROM ${tables.DATASETS} WHERE id = $1 AND (business_id = $2 OR business_id IS NULL)`, [id, businessId]);
            if (result.rowCount === 0) return res.status(403).json({ error: 'Not authorized to delete this dataset' });
        }
        res.json({ ok: true });
    } catch (e) { console.error('Failed to delete dataset', e); res.status(500).json({ error: 'Failed to delete dataset' }); }
});

// Admin: dataset content endpoints
app.get('/api/admin/datasets/:id/content', requireAdmin, async (req, res) => {
    try {
        const datasetId = Number(req.params.id);
        const limit = Number(req.query.limit || 200);
        const businessId = req.session?.businessId || null;
        const userCheck = req.session?.userId ? (await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId])).rows[0] : null;
        const isSuperAdmin = userCheck && String(userCheck.role || '').toLowerCase().includes('super');
        
        if (isSuperAdmin && !businessId) {
            const r = await pool.query(`SELECT * FROM ${tables.DATASET_CONTENT} WHERE dataset_id = $1 ORDER BY id DESC LIMIT $2`, [datasetId, limit]);
            res.json({ rows: r.rows, count: r.rowCount });
        } else {
            const r = await pool.query(`SELECT * FROM ${tables.DATASET_CONTENT} WHERE dataset_id = $1 AND (business_id = $2 OR business_id IS NULL) ORDER BY id DESC LIMIT $3`, [datasetId, businessId, limit]);
            res.json({ rows: r.rows, count: r.rowCount });
        }
    } catch (e) { console.error('Failed to list dataset content', e); res.status(500).json({ error: 'Failed to list dataset content' }); }
});

app.post('/api/admin/datasets/:id/content', requireAdmin, async (req, res) => {
    try {
        const datasetId = Number(req.params.id);
        const payload = req.body || {};
        if (!payload || Object.keys(payload).length === 0) return res.status(400).json({ error: 'Missing dataset_data' });
        const createdBy = (req.session && req.session.userId) ? req.session.userId : null;
        const businessId = req.session?.businessId || null;
        const r = await pool.query(`INSERT INTO ${tables.DATASET_CONTENT} (dataset_id, dataset_data, created_by, business_id) VALUES ($1,$2,$3,$4) RETURNING *`, [datasetId, payload, createdBy, businessId]);
        res.json(r.rows[0]);
    } catch (e) { console.error('Failed to save dataset content', e); res.status(500).json({ error: 'Failed to save dataset content' }); }
});

// Admin: update a dataset content row (cell-level edits and role assignments)
app.put('/api/admin/datasets/:id/content/:contentId', requireAdmin, async (req, res) => {
    try {
        const contentId = Number(req.params.contentId);
        const payload = req.body || {};
        if (!contentId) return res.status(400).json({ error: 'Missing contentId' });
        if (!payload || Object.keys(payload).length === 0) return res.status(400).json({ error: 'Missing payload' });

        const updates = [];
        const params = [];
        let idx = 1;
        if (payload.dataset_data !== undefined) { updates.push(`dataset_data = $${idx}`); params.push(payload.dataset_data); idx++; }
        if (payload.dataset_roles !== undefined) { updates.push(`dataset_roles = $${idx}`); params.push(payload.dataset_roles); idx++; }
        if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
        params.push(contentId);
        const q = `UPDATE ${tables.DATASET_CONTENT} SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
        const r = await pool.query(q, params);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(r.rows[0]);
    } catch (e) { console.error('Failed to update dataset content', e); res.status(500).json({ error: 'Failed to update dataset content' }); }
});

app.delete('/api/admin/datasets/:id/content/:contentId', requireAdmin, async (req, res) => {
    try {
        const contentId = Number(req.params.contentId);
        await pool.query(`DELETE FROM ${tables.DATASET_CONTENT} WHERE id = $1`, [contentId]);
        res.json({ ok: true });
    } catch (e) { console.error('Failed to delete dataset content', e); res.status(500).json({ error: 'Failed to delete dataset content' }); }
});

// Admin: upload Excel (base64 payload) and import rows into dataset content
app.post('/api/admin/datasets/:id/content/upload', requireAdmin, async (req, res) => {
    try {
        const datasetId = Number(req.params.id);
        const { fileName, fileBase64 } = req.body || {};
        if (!fileBase64) return res.status(400).json({ error: 'Missing fileBase64' });
        const buffer = Buffer.from(fileBase64, 'base64');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.worksheets[0];
        if (!sheet) return res.status(400).json({ error: 'No worksheet found in file' });

        // Read header row (first non-empty row)
        let headerRow = null;
        for (let i = 1; i <= sheet.rowCount; i++) {
            const row = sheet.getRow(i);
            const hasValues = row.values && row.values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
            if (hasValues) { headerRow = row; break; }
        }
        if (!headerRow) return res.status(400).json({ error: 'No header row detected' });
        const headers = (headerRow.values || []).slice(1).map(h => (h === null || h === undefined) ? '' : String(h).trim());

        const inserted = [];
        for (let r = headerRow.number + 1; r <= sheet.rowCount; r++) {
            const row = sheet.getRow(r);
            // skip empty rows
            const values = row.values || [];
            const isEmpty = values.slice(1).every(v => v === null || v === undefined || String(v).trim() === '');
            if (isEmpty) continue;
            const obj = {};
            for (let c = 1; c <= headers.length; c++) {
                const key = headers[c - 1] || (`col_${c}`);
                const cell = row.getCell(c);
                let val = null;
                try {
                    val = (cell && (cell.text !== undefined && cell.text !== null)) ? cell.text : (cell && cell.value !== undefined ? cell.value : null);
                } catch (e) { val = cell && cell.value ? cell.value : null; }
                obj[key] = val;
            }
            try {
                const rres = await pool.query(`INSERT INTO ${tables.DATASET_CONTENT} (dataset_id, dataset_data, created_by) VALUES ($1,$2,$3) RETURNING *`, [datasetId, obj, (req.session && req.session.userId) ? req.session.userId : null]);
                inserted.push(rres.rows[0]);
            } catch (ie) { console.error('Failed to insert dataset row', ie); }
        }
        res.json({ ok: true, inserted: inserted.length, sample: inserted.slice(0, 5) });
    } catch (e) { console.error('Failed to import excel for dataset', e); res.status(500).json({ error: 'Failed to import excel', details: String(e) }); }
});

// Power BI endpoints for reports
// Public: fetch Power BI config for a report (frontend can decide whether to render based on mode)
app.get('/api/reports/:id/powerbi', async (req, res) => {
    try {
        const reportId = Number(req.params.id);
        const r = await pool.query(`SELECT * FROM ${tables.REPORTS_POWERBI} WHERE activity_reports_id = $1 ORDER BY id DESC LIMIT 1`, [reportId]);
        if (r.rows.length === 0) return res.json(null);
        return res.json(r.rows[0]);
    } catch (e) {
        console.error('Failed to fetch report powerbi', e);
        res.status(500).json({ error: 'Failed to fetch powerbi config' });
    }
});

// Admin: upsert Power BI config for a report
app.post('/api/admin/reports/:id/powerbi', requireAdmin, async (req, res) => {
    try {
        const reportId = Number(req.params.id);
        const { powerbi_link, link_type, mode } = req.body || {};
        if (!powerbi_link) return res.status(400).json({ error: 'Missing powerbi_link' });
        const createdBy = (req.session && req.session.userId) ? req.session.userId : null;
        // Check if exists
        const exist = await pool.query(`SELECT * FROM ${tables.REPORTS_POWERBI} WHERE activity_reports_id = $1 ORDER BY id DESC LIMIT 1`, [reportId]);
        if (exist.rows.length) {
            const id = exist.rows[0].id;
            const ur = await pool.query(`UPDATE ${tables.REPORTS_POWERBI} SET powerbi_link=$1, link_type=$2, mode=$3, created_by=$4 WHERE id=$5 RETURNING *`, [powerbi_link, link_type || null, mode || null, createdBy, id]);
            return res.json(ur.rows[0]);
        }
        const r = await pool.query(`INSERT INTO ${tables.REPORTS_POWERBI} (activity_reports_id, powerbi_link, link_type, mode, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [reportId, powerbi_link, link_type || null, mode || null, createdBy]);
        res.json(r.rows[0]);
    } catch (e) {
        console.error('Failed to save report powerbi', e);
        res.status(500).json({ error: 'Failed to save powerbi config' });
    }
});

// Also accept PUT for admin report Power BI (some frontends use PUT)
app.put('/api/admin/reports/:id/powerbi', requireAdmin, async (req, res) => {
    try {
        const reportId = Number(req.params.id);
        const { powerbi_link, link_type, mode } = req.body || {};
        if (!powerbi_link) return res.status(400).json({ error: 'Missing powerbi_link' });
        const createdBy = (req.session && req.session.userId) ? req.session.userId : null;
        // Check if exists
        const exist = await pool.query(`SELECT * FROM ${tables.REPORTS_POWERBI} WHERE activity_reports_id = $1 ORDER BY id DESC LIMIT 1`, [reportId]);
        if (exist.rows.length) {
            const id = exist.rows[0].id;
            const ur = await pool.query(`UPDATE ${tables.REPORTS_POWERBI} SET powerbi_link=$1, link_type=$2, mode=$3, created_by=$4 WHERE id=$5 RETURNING *`, [powerbi_link, link_type || null, mode || null, createdBy, id]);
            return res.json(ur.rows[0]);
        }
        const r = await pool.query(`INSERT INTO ${tables.REPORTS_POWERBI} (activity_reports_id, powerbi_link, link_type, mode, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [reportId, powerbi_link, link_type || null, mode || null, createdBy]);
        res.json(r.rows[0]);
    } catch (e) {
        console.error('Failed to save report powerbi (PUT)', e);
        res.status(500).json({ error: 'Failed to save powerbi config' });
    }
});

// Admin: delete a powerbi config by id
app.delete('/api/admin/reports/:id/powerbi/:pbid', requireAdmin, async (req, res) => {
    try {
        const pbid = Number(req.params.pbid);
        await pool.query(`DELETE FROM ${tables.REPORTS_POWERBI} WHERE id = $1`, [pbid]);
        res.json({ ok: true });
    } catch (e) {
        console.error('Failed to delete report powerbi', e);
        res.status(500).json({ error: 'Failed to delete powerbi config' });
    }
});

// Activity-level Power BI endpoints
// Public: fetch Power BI embed link stored on an activity
app.get('/api/activities/:id/powerbi', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        const r = await pool.query(`SELECT powerbi_url FROM ${tables.ACTIVITIES} WHERE id = $1`, [id]);
        if (r.rowCount === 0) return res.status(404).json({ error: 'Activity not found' });
        return res.json({ powerbi_link: r.rows[0].powerbi_url || null, link_type: r.rows[0].powerbi_link_type || null, mode: r.rows[0].powerbi_mode || null });
    } catch (e) {
        console.error('Failed to fetch activity powerbi', e);
        res.status(500).json({ error: 'Failed to fetch activity powerbi' });
    }
});

// Admin: upsert Power BI link for an activity (stored in ${tables.ACTIVITIES}.powerbi_url)
app.post('/api/admin/activities/:id/powerbi', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { powerbi_link, link_type, mode } = req.body || {};
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        if (!powerbi_link) return res.status(400).json({ error: 'Missing powerbi_link' });
        // Ensure columns exist (safe idempotent migration)
        try { await pool.query("ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS powerbi_url TEXT"); } catch (e) { /* ignore */ }
        try { await pool.query("ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS powerbi_link_type TEXT"); } catch (e) { /* ignore */ }
        try { await pool.query("ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS powerbi_mode TEXT"); } catch (e) { /* ignore */ }
        const u = await pool.query(`UPDATE ${tables.ACTIVITIES} SET powerbi_url = $1, powerbi_link_type = $2, powerbi_mode = $3 WHERE id = $4 RETURNING *`, [powerbi_link, link_type || null, mode || null, id]);
        if (u.rowCount === 0) return res.status(404).json({ error: 'Activity not found' });
        res.json({ ok: true, activity: u.rows[0] });
    } catch (e) {
        console.error('Failed to save activity powerbi', e);
        res.status(500).json({ error: 'Failed to save activity powerbi' });
    }
});

// Also accept PUT for admin activity Power BI (some frontends call PUT)
app.put('/api/admin/activities/:id/powerbi', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { powerbi_link, link_type, mode } = req.body || {};
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        if (!powerbi_link) return res.status(400).json({ error: 'Missing powerbi_link' });
        // Ensure columns exist (safe idempotent migration)
        try { await pool.query("ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS powerbi_url TEXT"); } catch (e) { /* ignore */ }
        try { await pool.query("ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS powerbi_link_type TEXT"); } catch (e) { /* ignore */ }
        try { await pool.query("ALTER TABLE ${tables.ACTIVITIES} ADD COLUMN IF NOT EXISTS powerbi_mode TEXT"); } catch (e) { /* ignore */ }
        const u = await pool.query(`UPDATE ${tables.ACTIVITIES} SET powerbi_url = $1, powerbi_link_type = $2, powerbi_mode = $3 WHERE id = $4 RETURNING *`, [powerbi_link, link_type || null, mode || null, id]);
        if (u.rowCount === 0) return res.status(404).json({ error: 'Activity not found' });
        res.json({ ok: true, activity: u.rows[0] });
    } catch (e) {
        console.error('Failed to save activity powerbi (PUT)', e);
        res.status(500).json({ error: 'Failed to save activity powerbi' });
    }
});

// Admin: clear activity powerbi link
app.delete('/api/admin/activities/:id/powerbi', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        await pool.query(`UPDATE ${tables.ACTIVITIES} SET powerbi_url = NULL WHERE id = $1`, [id]);
        res.json({ ok: true });
    } catch (e) {
        console.error('Failed to clear activity powerbi', e);
        res.status(500).json({ error: 'Failed to clear activity powerbi' });
    }
});

// Admin: Report Templates (Report Builder) CRUD
app.get('/api/admin/report_templates', requireAdmin, async (req, res) => {
    try {
        const r = await pool.query(`SELECT * FROM ${tables.REPORT_TEMPLATES} ORDER BY id DESC`);
        res.json(r.rows);
    } catch (e) { console.error('Failed to list report templates', e); res.status(500).json({ error: 'Failed to list report templates' }); }
});

app.post('/api/admin/report_templates', requireAdmin, async (req, res) => {
    try {
        const { id, name, activity_id, template_json, paper_size, orientation, header_image, footer_image, watermark_image, assets } = req.body || {};
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'Missing name' });
        if (id) {
            const r = await pool.query(`UPDATE ${tables.REPORT_TEMPLATES} SET name=$1, activity_id=$2, template_json=$3, paper_size=$4, orientation=$5, header_image=$6, footer_image=$7, watermark_image=$8, assets=$9 WHERE id=$10 RETURNING *`, [name, activity_id || null, template_json || null, paper_size || null, orientation || null, header_image || null, footer_image || null, watermark_image || null, assets ? JSON.stringify(assets) : null, id]);
            return res.json(r.rows[0]);
        }
        const createdBy = (req.session && req.session.userId) ? req.session.userId : null;
        const r = await pool.query(`INSERT INTO ${tables.REPORT_TEMPLATES} (name, activity_id, template_json, paper_size, orientation, header_image, footer_image, watermark_image, assets, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [name, activity_id || null, template_json || null, paper_size || null, orientation || null, header_image || null, footer_image || null, watermark_image || null, assets ? JSON.stringify(assets) : null, createdBy]);
        res.json(r.rows[0]);
    } catch (e) { console.error('Failed to save report template', e); res.status(500).json({ error: 'Failed to save report template' }); }
});

// Public: list report templates optionally filtered by activity
app.get('/api/report_templates', async (req, res) => {
    try {
        const { activityId } = req.query;
        if (activityId) {
            const r = await pool.query(`SELECT * FROM ${tables.REPORT_TEMPLATES} WHERE activity_id = $1 ORDER BY id DESC`, [activityId]);
            return res.json(r.rows);
        }
        const r = await pool.query(`SELECT * FROM ${tables.REPORT_TEMPLATES} ORDER BY id DESC`);
        res.json(r.rows);
    } catch (e) { console.error('Failed to list public report templates', e); res.status(500).json({ error: 'Failed to list report templates' }); }
});

app.delete('/api/admin/report_templates/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        await pool.query(`DELETE FROM ${tables.REPORT_TEMPLATES} WHERE id = $1`, [id]);
        res.json({ ok: true });
    } catch (e) { console.error('Failed to delete report template', e); res.status(500).json({ error: 'Failed to delete report template' }); }
});

// Public: get a report template by id (useful for previewing)
app.get('/api/report_templates/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const r = await pool.query(`SELECT * FROM ${tables.REPORT_TEMPLATES} WHERE id = $1`, [id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(r.rows[0]);
    } catch (e) { console.error('Failed to fetch report template', e); res.status(500).json({ error: 'Failed to fetch report template' }); }
});

// Roles & Permissions management endpoints
app.get('/api/admin/roles', requireAdmin, async (req, res) => {
    try { const r = await pool.query(`SELECT * FROM ${tables.ROLES} ORDER BY id ASC`); res.json(r.rows); } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to list roles' }); }
});
app.post('/api/admin/roles', requireAdmin, async (req, res) => {
    try { const { id, name, description } = req.body; if (id) { const r = await pool.query(`UPDATE ${tables.ROLES} SET name=$1, description=$2 WHERE id=$3 RETURNING *`, [name, description, id]); return res.json(r.rows[0]); } const r = await pool.query(`INSERT INTO ${tables.ROLES} (name, description) VALUES ($1,$2) RETURNING *`, [name, description]); res.json(r.rows[0]); } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save role' }); }
});
// Delete a role (admin only)
app.delete('/api/admin/roles/:id', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query(`DELETE FROM ${tables.ROLE_PERMISSIONS} WHERE role_id = $1`, [id]);
        await pool.query(`DELETE FROM ${tables.USER_ROLES} WHERE role_id = $1`, [id]);
        await pool.query(`DELETE FROM ${tables.ROLES} WHERE id = $1`, [id]);
        res.json({ ok: true });
    } catch (e) { console.error('Failed to delete role', e); res.status(500).json({ error: 'Failed to delete role' }); }
});

app.get('/api/admin/permissions', requireAdmin, async (req, res) => {
    try { const r = await pool.query(`SELECT * FROM ${tables.PERMISSIONS} ORDER BY id ASC`); res.json(r.rows); } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to list permissions' }); }
});
app.post('/api/admin/permissions', requireAdmin, async (req, res) => {
    try { const { id, name, description } = req.body; if (id) { const r = await pool.query(`UPDATE ${tables.PERMISSIONS} SET name=$1, description=$2 WHERE id=$3 RETURNING *`, [name, description, id]); return res.json(r.rows[0]); } const r = await pool.query(`INSERT INTO ${tables.PERMISSIONS} (name, description) VALUES ($1,$2) RETURNING *`, [name, description]); res.json(r.rows[0]); } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save permission' }); }
});
// Delete a permission (admin only)
app.delete('/api/admin/permissions/:id', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query(`DELETE FROM ${tables.ROLE_PERMISSIONS} WHERE permission_id = $1`, [id]);
        await pool.query(`DELETE FROM ${tables.PERMISSIONS} WHERE id = $1`, [id]);
        res.json({ ok: true });
    } catch (e) { console.error('Failed to delete permission', e); res.status(500).json({ error: 'Failed to delete permission' }); }
});

app.post('/api/admin/roles/assign', requireAdmin, async (req, res) => {
    try { const { userId, roleId } = req.body; await pool.query(`INSERT INTO ${tables.USER_ROLES} (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, roleId]); res.json({ success: true }); } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to assign role' }); }
});

app.post('/api/admin/roles/unassign', requireAdmin, async (req, res) => {
    try { const { userId, roleId } = req.body; await pool.query(`DELETE FROM ${tables.USER_ROLES} WHERE user_id=$1 AND role_id=$2`, [userId, roleId]); res.json({ success: true }); } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to unassign role' }); }
});

app.get('/api/admin/user_roles', requireAdmin, async (req, res) => {
    try { const userId = req.query.userId; if (!userId) return res.status(400).json({ error: 'Missing userId' }); const r = await pool.query(`SELECT ur.role_id, r.name FROM ${tables.USER_ROLES} ur JOIN ${tables.ROLES} r ON ur.role_id = r.id WHERE ur.user_id = $1`, [userId]); res.json(r.rows); } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to list user roles' }); }
});

app.post('/api/admin/role_permissions', requireAdmin, async (req, res) => {
    try { const { roleId, permissionId } = req.body; await pool.query(`INSERT INTO ${tables.ROLE_PERMISSIONS} (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [roleId, permissionId]); res.json({ success: true }); } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to assign permission to role' }); }
});

// Remove a permission from a role
app.post('/api/admin/role_permissions/remove', requireAdmin, async (req, res) => {
    try { const { roleId, permissionId } = req.body; await pool.query(`DELETE FROM ${tables.ROLE_PERMISSIONS} WHERE role_id=$1 AND permission_id=$2`, [roleId, permissionId]); res.json({ success: true }); } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to remove permission from role' }); }
});

// List permissions assigned to a role
app.get('/api/admin/role_permissions', requireAdmin, async (req, res) => {
    try {
        const roleId = req.query.roleId;
        if (!roleId) return res.status(400).json({ error: 'Missing roleId' });
        const r = await pool.query(`SELECT p.* FROM ${tables.ROLE_PERMISSIONS} rp JOIN ${tables.PERMISSIONS} p ON rp.permission_id = p.id WHERE rp.role_id = $1 ORDER BY p.id`, [roleId]);
        res.json(r.rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to list role permissions' }); }
});

// Roles with their permissions (convenience endpoint)
app.get('/api/admin/roles_with_perms', requireAdmin, async (req, res) => {
    try {
        const rolesRes = await pool.query(`SELECT * FROM ${tables.ROLES} ORDER BY id`);
        const out = [];
        for (const r of rolesRes.rows) {
            const permsRes = await pool.query(`SELECT p.* FROM ${tables.ROLE_PERMISSIONS} rp JOIN ${tables.PERMISSIONS} p ON rp.permission_id = p.id WHERE rp.role_id = $1 ORDER BY p.id`, [r.id]);
            out.push({ ...r, permissions: permsRes.rows });
        }
        res.json(out);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch roles with permissions' }); }
});

// Accept bulk audit events from clients (clients should batch localStorage events and POST them here)
app.post('/api/audit/bulk', async (req, res) => {
    try {
        const payload = req.body || {};
        const events = Array.isArray(payload.events) ? payload.events : (payload.events ? [payload.events] : []);
        if (!events.length) return res.status(400).json({ error: 'Missing events array' });
        const uid = (req.session && req.session.userId) ? req.session.userId : (payload.userId || null);
        // store the entire batch as one JSONB entry for minimalistic audit
        await pool.query(`INSERT INTO ${tables.AUDIT_BATCHES} (user_id, events) VALUES ($1,$2)`, [uid, JSON.stringify(events)]);
        return res.json({ ok: true });
    } catch (e) {
        console.error('Failed to accept audit bulk', e);
        return res.status(500).json({ error: 'Failed to accept audit events' });
    }
});

// Admin: list audit batches (detailed)
app.get('/api/admin/audit_batches', requireAdmin, async (req, res) => {
    try {
        const r = await pool.query(`SELECT ab.*, u.email as user_email FROM ${tables.AUDIT_BATCHES} ab LEFT JOIN ${tables.USERS} u ON u.id = ab.user_id ORDER BY ab.created_at DESC`);
        // project rows into a friendly shape for frontend
        const out = (r.rows || []).map(row => ({
            id: row.id,
            user_id: row.user_id,
            created_at: row.created_at,
            created_by: row.user_email || null,
            events: row.events || null,
            batch_name: (Array.isArray(row.events) && row.events[0] && (row.events[0].batch || row.events[0].type)) ? (row.events[0].batch || row.events[0].type) : `batch_${row.id}`,
            details: row.events || null,
            status: (Array.isArray(row.events) && row.events[0] && row.events[0].status) ? row.events[0].status : null
        }));
        res.json(out);
    } catch (e) { console.error('Failed to list audit batches (admin)', e); res.status(500).json({ error: 'Failed to list audit batches' }); }
});

// Public (dev): list recent audit batches (limited) - enabled by default for convenience
app.get('/api/audit_batches', async (req, res) => {
    try {
        const limit = Number(req.query.limit || 200);
        const r = await pool.query(`SELECT ab.*, u.email as user_email FROM ${tables.AUDIT_BATCHES} ab LEFT JOIN ${tables.USERS} u ON u.id = ab.user_id ORDER BY ab.created_at DESC LIMIT $1`, [limit]);
        const out = (r.rows || []).map(row => ({
            id: row.id,
            user_id: row.user_id,
            created_at: row.created_at,
            created_by: row.user_email || null,
            events: row.events || null,
            batch_name: (Array.isArray(row.events) && row.events[0] && (row.events[0].batch || row.events[0].type)) ? (row.events[0].batch || row.events[0].type) : `batch_${row.id}`,
            details: row.events || null,
            status: (Array.isArray(row.events) && row.events[0] && row.events[0].status) ? row.events[0].status : null
        }));
        res.json(out);
    } catch (e) { console.error('Failed to list audit batches (public)', e); res.status(500).json({ error: 'Failed to list audit batches' }); }
});

// Sync questions from either a form-definition object or a flat questions array into the `questions` table
async function syncQuestions(activityId, formDefOrQuestions) {
    if (!activityId) return;
    try {
        await pool.query(`DELETE FROM ${tables.QUESTIONS} WHERE activity_id = $1`, [activityId]);
        const insertText = `INSERT INTO ${tables.QUESTIONS} (id, activity_id, page_name, section_name, question_text, question_helper, correct_answer, answer_type, category, question_group, column_size, status, required, options, metadata, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`;

        // If an array is provided, treat it as a flat list of question objects
        if (Array.isArray(formDefOrQuestions)) {
            for (const q of formDefOrQuestions) {
                const qId = q.id || q.questionId || (`q_${activityId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
                const pageName = q.pageName || q.page_name || q.page || null;
                const sectionName = q.sectionName || q.section_name || q.section || null;
                const questionText = q.questionText || q.question_text || q.text || null;
                const questionHelper = q.questionHelper || q.question_helper || q.helper || null;
                const answerType = q.answerType || q.answer_type || q.type || null;
                const category = q.category || null;
                const questionGroup = q.questionGroup || q.question_group || null;
                const columnSize = q.columnSize || q.column_size || null;
                const status = q.status || 'Active';
                const options = q.options ? JSON.stringify(q.options) : null;
                const metadata = q.metadata ? JSON.stringify(q.metadata) : null;
                const correctAnswer = q.correctAnswer || q.correct_answer || q.correct || null;
                let createdBy = q.createdBy || q.created_by || null;
                // coerce createdBy to integer id or null to avoid invalid input syntax errors
                const createdByParam = (createdBy === null || createdBy === undefined) ? null : (Number.isInteger(Number(createdBy)) ? Number(createdBy) : null);
                await pool.query(insertText, [qId, activityId, pageName, sectionName, questionText, questionHelper, correctAnswer, answerType, category, questionGroup, columnSize, status, q.required || false, options, metadata, createdByParam]);
            }
            return;
        }

        // Otherwise assume a form-definition object with pages->sections->questions
        const formDef = formDefOrQuestions || {};
        for (const page of formDef.pages || []) {
            const pageName = page.name || page.id || null;
            for (const section of page.sections || []) {
                const sectionName = section.name || section.id || null;
                const sectionGroup = section.groupName || null;
                for (const q of section.questions || []) {
                    const qId = q.id || q.questionId || (`q_${activityId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
                    const questionText = q.questionText || q.text || null;
                    const questionHelper = q.questionHelper || q.helper || null;
                    const answerType = q.answerType || q.type || null;
                    const category = q.category || null;
                    // Prefer question-level group, otherwise fall back to section.groupName so repeatable
                    // section settings are applied to each question in that section.
                    const questionGroup = q.questionGroup || sectionGroup || null;
                    const columnSize = q.columnSize || null;
                    const status = q.status || 'Active';
                    const options = q.options ? JSON.stringify(q.options) : null;
                    const metadata = q.metadata ? JSON.stringify(q.metadata) : null;
                    const correctAnswer = q.correctAnswer || q.correct_answer || q.correct || null;
                    let createdBy = q.createdBy || null;
                    const createdByParam = (createdBy === null || createdBy === undefined) ? null : (Number.isInteger(Number(createdBy)) ? Number(createdBy) : null);
                    await pool.query(insertText, [qId, activityId, pageName, sectionName, questionText, questionHelper, correctAnswer, answerType, category, questionGroup, columnSize, status, q.required || false, options, metadata, createdByParam]);
                }
            }
        }
    } catch (err) {
        console.error('syncQuestions error:', err);
    }
}



// --- Auth Routes (Dev Mode) ---

// Login Route: Simulates login by finding or creating a user with the specific role
app.post('/auth/login', async (req, res) => {
    const { role, email, password } = req.body;

    try {
        if (email && password) {
            // Authenticate by email/password
            const result = await pool.query(`SELECT * FROM ${tables.USERS} WHERE email = $1`, [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const user = result.rows[0];
            // Verify password using bcrypt. If the stored password is plaintext, allow fallback and migrate to hashed.
            let passwordMatches = false;
            try {
                if (user.password) {
                    passwordMatches = await bcrypt.compare(password, user.password);
                }
            } catch (e) {
                console.warn('bcrypt compare failed, will attempt plaintext fallback', e);
                passwordMatches = false;
            }

            // Fallback: if stored password was plaintext and matches, migrate it to a bcrypt hash
            if (!passwordMatches && user.password === password) {
                try {
                    const newHash = await bcrypt.hash(password, 10);
                    await pool.query(`UPDATE ${tables.USERS} SET password = $1 WHERE id = $2`, [newHash, user.id]);
                    passwordMatches = true;
                    console.log('Migrated user password to bcrypt hash for user id', user.id);
                } catch (e) {
                    console.error('Failed to migrate plaintext password to hash for user id', user.id, e);
                }
            }

            if (!passwordMatches) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // If email verification is enabled, prevent login until user is verified/active
            try {
                const verifyToggle = (process.env.ENABLE_EMAIL_VERIFICATION || '').toString().toLowerCase();
                if (verifyToggle === 'true' || verifyToggle === '1') {
                    if (!user.status || String(user.status).toLowerCase() !== 'active') {
                        return res.status(403).json({ error: 'Email not verified. Check your email for a verification link.' });
                    }
                }
            } catch (e) { /* ignore */ }

            req.session.userId = user.id;
            // set business id in session for scoping
            try { req.session.businessId = user.business_id || null; } catch (e) { req.session.businessId = null; }
            // Update last_login_at timestamp
            try { 
                await pool.query(`UPDATE ${tables.USERS} SET last_login_at = NOW() WHERE id = $1`, [user.id]);
            } catch (e) { console.warn('Failed to update last_login_at', e); }
            // Return sanitized user object (omit password)
            const safeUser = {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role,
                status: user.status,
                businessId: user.business_id || null,
                profileImage: user.profile_image || null
            };
            // Record login in audit_batches for server-side traceability
            try {
                await pool.query(`INSERT INTO ${tables.AUDIT_BATCHES} (user_id, events) VALUES ($1,$2)`, [user.id, JSON.stringify([{ type: 'login', email: user.email, success: true, ts: new Date().toISOString(), ip: req.ip }])]);
            } catch (e) { console.error('Failed to write audit login record', e); }
            return res.json(safeUser);
        }

        // Fallback: role-based demo login (keeps old behavior)
        if (!role) return res.status(400).json({ error: 'Missing role' });
        const demoEmail = `${role.toLowerCase().replace(' ', '')}@example.com`;
        let result = await pool.query(`SELECT * FROM ${tables.USERS} WHERE email = $1`, [demoEmail]);

        let user;
        if (result.rows.length > 0) {
            user = result.rows[0];
        } else {
            // ensure a demo business exists
            let busRes = await pool.query("SELECT id FROM ${tables.BUSINESSES} WHERE name = 'Demo' LIMIT 1");
            let busId = busRes.rows[0] ? busRes.rows[0].id : null;
            if (!busId) {
                const br = await pool.query(`INSERT INTO ${tables.BUSINESSES} (name, phone) VALUES ($1,$2) RETURNING id`, ['Demo', null]);
                busId = br.rows[0].id;
            }
            const insertRes = await pool.query(
                `INSERT INTO ${tables.USERS} (first_name, last_name, email, role, status, business_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                ['Demo', role, demoEmail, role, 'Active', busId]
            );
            user = insertRes.rows[0];
        }
        req.session.userId = user.id;
        try { req.session.businessId = user.business_id || null; } catch (e) { req.session.businessId = null; }
        // Update last_login_at timestamp
        try { 
            await pool.query(`UPDATE ${tables.USERS} SET last_login_at = NOW() WHERE id = $1`, [user.id]);
        } catch (e) { console.warn('Failed to update last_login_at', e); }
        try {
            await pool.query(`INSERT INTO ${tables.AUDIT_BATCHES} (user_id, events) VALUES ($1,$2)`, [user.id || null, JSON.stringify([{ type: 'login', email: user.email || null, success: true, ts: new Date().toISOString(), demo: true, ip: req.ip }])]);
        } catch (e) { console.error('Failed to write audit login record', e); }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Public registration endpoint: allows self-registration for non-admin roles (public/controller/validator)
app.post('/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, organizationName, phoneNumber } = req.body || {};
        if (!email) return res.status(400).json({ error: 'Missing email' });
        // Force self-registered users to be 'public' role only. All other roles must be created by an admin.
        const requested = 'public';

        // check existing
        const existing = await pool.query(`SELECT id FROM ${tables.USERS} WHERE email = $1`, [email]);
        if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

        let hashed = null;
        if (password) {
            try { hashed = await bcrypt.hash(password, 10); } catch (e) { hashed = password; }
        }

        // Determine whether to require email verification
        const verifyToggle = (process.env.ENABLE_EMAIL_VERIFICATION || '').toString().toLowerCase();
        const requireVerify = (verifyToggle === 'true' || verifyToggle === '1');
        const initialStatus = requireVerify ? 'Pending' : 'Active';

        // create business/organization record if organization details provided
        let businessId = null;
        try {
            // Check if landing page config locks registration to a single organization
            try {
                const lockRes = await pool.query(`SELECT locked_organization_id FROM ${tables.LANDING_PAGE_CONFIG} WHERE business_id = $1`, [0]);
                if (lockRes.rows && lockRes.rows[0] && lockRes.rows[0].locked_organization_id) {
                    businessId = lockRes.rows[0].locked_organization_id;
                }
            } catch (innerE) {
                console.warn('Failed to check locked organization for registration', innerE && innerE.message ? innerE.message : innerE);
            }

            // Only create a new business if there is no locked organization and an organizationName was provided
            if (!businessId && organizationName) {
                const br = await pool.query(`INSERT INTO ${tables.BUSINESSES} (name, phone) VALUES ($1, $2) RETURNING id`, [organizationName, phoneNumber || null]);
                businessId = br.rows[0] ? br.rows[0].id : null;
            }
        } catch (e) { console.error('Failed to create business during registration', e); }

        const r = await pool.query(`INSERT INTO ${tables.USERS} (first_name, last_name, email, password, role, status, business_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, first_name, last_name, email, role, status, business_id`, [firstName || null, lastName || null, email, hashed || null, requested, initialStatus, businessId]);
        const u = r.rows[0];

        // If verification is required, create token and send email
        if (requireVerify) {
            try {
                const token = crypto.randomBytes(32).toString('hex');
                const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                await pool.query(`INSERT INTO ${tables.EMAIL_VERIFICATIONS} (user_id, token, expires_at) VALUES ($1,$2,$3)`, [u.id, token, expires]);

                // load smtp
                const sres = await pool.query("SELECT value FROM ${tables.SETTINGS} WHERE key = 'smtp' AND business_id = $1", [businessId]);
                const smtp = sres.rows[0] ? sres.rows[0].value : null;
                const frontend = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
                const verifyUrl = `${frontend.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
                if (smtp) {
                    try {
                        const nm = await import('nodemailer');
                        const transporter = nm.createTransport(smtp);
                        const text = `Hello ${u.first_name || ''},\n\nThank you for registering. Please verify your email by clicking the link below:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.`;
                        await transporter.sendMail({ from: smtp.from || smtp.user || 'no-reply@example.com', to: u.email, subject: 'Verify your email', text });
                    } catch (e) { console.error('Failed to send verification email', e); }
                } else {
                    console.warn('SMTP not configured; cannot send verification email');
                }
            } catch (e) {
                console.error('Failed to create/send email verification token', e);
            }
        }

        // Optionally create default role assignment rows later via admin
        // set session user and business
        try { req.session.userId = u.id; req.session.businessId = u.business_id || businessId || null; } catch (e) { /* ignore */ }
        res.json({ id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, role: u.role, status: u.status, businessId: u.business_id || businessId || null, message: requireVerify ? 'Registered. Check your email for verification link.' : 'Registered' });
    } catch (e) {
        console.error('Registration failed', e);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Verify email endpoint
app.get('/auth/verify-email', async (req, res) => {
    try {
        const token = req.query.token || req.query.t || null;
        if (!token) return res.status(400).send('Missing token');
        const tres = await pool.query(`SELECT * FROM ${tables.EMAIL_VERIFICATIONS} WHERE token = $1`, [String(token)]);
        if (tres.rows.length === 0) return res.status(400).send('Invalid or expired token');
        const row = tres.rows[0];
        if (row.expires_at && new Date(row.expires_at) < new Date()) {
            // remove expired token
            try { await pool.query(`DELETE FROM ${tables.EMAIL_VERIFICATIONS} WHERE token = $1`, [token]); } catch (e) { /* ignore */ }
            return res.status(400).send('Token expired');
        }
        // activate user
        await pool.query(`UPDATE ${tables.USERS} SET status = $1 WHERE id = $2`, ['Active', row.user_id]);
        // remove token record
        await pool.query(`DELETE FROM ${tables.EMAIL_VERIFICATIONS} WHERE token = $1`, [token]);
        // Redirect to frontend success page if FRONTEND_URL available
        const frontend = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
        return res.redirect(`${frontend.replace(/\/$/, '')}/login?verified=1`);
    } catch (e) {
        console.error('verify-email error', e);
        res.status(500).send('Verification failed');
    }
});

app.get('/api/current_user', async (req, res) => {
    if (!req.session.userId) {
        return res.send(null);
    }
    try {
        const result = await pool.query(`SELECT * FROM ${tables.USERS} WHERE id = $1`, [req.session.userId]);
        if (result.rows.length > 0) {
            // Snake_case to camelCase for frontend consistency
            const u = result.rows[0];
            res.send({
                id: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                email: u.email,
                role: u.role,
                status: u.status,
                facilityId: u.facility_id,
                businessId: u.business_id || null,
                profileImage: u.profile_image || null
            });
        } else {
            res.send(null);
        }
    } catch (err) {
        console.error(err);
        res.send(null);
    }
});

app.get('/api/logout', (req, res) => {
    req.session = null;
    res.sendStatus(200);
});

// --- API Routes ---

// Programs
app.get('/api/programs', async (req, res) => {
    try {
        // Scope programs to the user's business unless super-admin
        const businessId = req.session?.businessId || null;
        const userCheck = req.session?.userId ? (await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId])).rows[0] : null;
        const isSuperAdmin = userCheck && String(userCheck.role || '').toLowerCase().includes('super');
        
        let q = `SELECT * FROM ${tables.PROGRAMS}`;
        const params = [];
        
        // Super-admin without business context sees all, otherwise filter by business_id
        if (!isSuperAdmin || businessId) {
            q += ' WHERE business_id = $1 OR business_id IS NULL';
            params.push(businessId);
        }
        
        q += ' ORDER BY created_at DESC';
        const result = await pool.query(q, params);
        res.json(result.rows);
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/programs', async (req, res) => {
    const { name, details, type, category, id } = req.body;
    try {
        if (id) {
            const result = await pool.query(
                `UPDATE ${tables.PROGRAMS} SET name=$1, details=$2, type=$3, category=$4 WHERE id=$5 RETURNING *`,
                [name, details, type, category, id]
            );
            res.json(result.rows[0]);
        } else {
            // attach business_id from session unless super-admin provided explicit businessId
            let businessId = null;
            if (req.session && req.session.userId) {
                if (await isSuperAdmin(req) && req.body.businessId) businessId = req.body.businessId;
                else businessId = req.session.businessId || null;
            }
            const result = await pool.query(
                `INSERT INTO ${tables.PROGRAMS} (name, details, type, category, business_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [name, details, type, category, businessId]
            );
            res.json(result.rows[0]);
        }
    } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/programs/:id', async (req, res) => {
    const programId = Number(req.params.id);
    if (!programId) return res.status(400).send('Invalid id');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Find all activities for this program
        const acts = (await client.query(`SELECT id FROM ${tables.ACTIVITIES} WHERE program_id = $1`, [programId])).rows.map(r => r.id);

        if (acts.length > 0) {
            // Delete uploaded docs attached to those activities
            await client.query(`DELETE FROM ${tables.UPLOADED_DOCS} WHERE activity_id = ANY($1::int[])`, [acts]);

            // Find reports for these activities
            const reports = (await client.query(`SELECT id FROM ${tables.ACTIVITY_REPORTS} WHERE activity_id = ANY($1::int[])`, [acts])).rows.map(r => r.id);
            if (reports.length > 0) {
                // Delete uploaded docs tied to reports
                await client.query(`DELETE FROM ${tables.UPLOADED_DOCS} WHERE report_id = ANY($1::int[])`, [reports]);
                // Delete answers for those reports
                await client.query(`DELETE FROM ${tables.ANSWERS} WHERE report_id = ANY($1::int[])`, [reports]);
                // Delete the reports themselves
                await client.query(`DELETE FROM ${tables.ACTIVITY_REPORTS} WHERE id = ANY($1::int[])`, [reports]);
            }

            // Delete answers tied to questions belonging to these activities
            await client.query(`DELETE FROM ${tables.ANSWERS} WHERE question_id IN (SELECT id FROM ${tables.QUESTIONS} WHERE activity_id = ANY($1::int[]))`, [acts]);

            // Delete questions for these activities
            await client.query(`DELETE FROM ${tables.QUESTIONS} WHERE activity_id = ANY($1::int[])`, [acts]);

            // Delete report templates for these activities
            await client.query(`DELETE FROM ${tables.REPORT_TEMPLATES} WHERE activity_id = ANY($1::int[])`, [acts]);

            // Delete any indicators associated with these activities
            await client.query(`DELETE FROM ${tables.INDICATORS} WHERE activity_id = ANY($1::int[])`, [acts]);

            // Finally delete the activities
            await client.query(`DELETE FROM ${tables.ACTIVITIES} WHERE id = ANY($1::int[])`, [acts]);
        }

        // Delete any indicators scoped to the program itself
        await client.query(`DELETE FROM ${tables.INDICATORS} WHERE program_id = $1`, [programId]);

        // Delete the program record
        await client.query(`DELETE FROM ${tables.PROGRAMS} WHERE id = $1`, [programId]);

        await client.query('COMMIT');
        res.json({ ok: true });
    } catch (e) {
        try { await client.query('ROLLBACK'); } catch (er) { console.error('Rollback failed', er); }
        console.error('Failed to delete program cascade', e && e.message ? e.message : e);
        res.status(500).json({ error: 'Failed to delete program' });
    } finally {
        client.release();
    }
});

// Activities
app.get('/api/activities', async (req, res) => {
    try {
        // Scope activities to business
        const businessId = req.session?.businessId || null;
        const userCheck = req.session?.userId ? (await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId])).rows[0] : null;
        const isSuperAdmin = userCheck && String(userCheck.role || '').toLowerCase().includes('super');
        
        let q = `SELECT * FROM ${tables.ACTIVITIES}`;
        const params = [];
        
        // Super-admin without business context sees all, otherwise filter by business_id
        if (!isSuperAdmin || businessId) {
            q += ' WHERE business_id = $1 OR business_id IS NULL';
            params.push(businessId);
        }
        
        q += ' ORDER BY created_at DESC';
        const result = await pool.query(q, params);
        const mapped = result.rows.map(row => ({
            ...row,
            programId: row.program_id,
            startDate: row.start_date,
            endDate: row.end_date,
            responseType: row.response_type || row.responsetype || null,
            formDefinition: row.form_definition || null,
        }));
        res.json(mapped);
    } catch (e) { res.status(500).send(e.message); }
});

// Get a single activity by id
app.get('/api/activities/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).send('Invalid id');
        const result = await pool.query(`SELECT * FROM ${tables.ACTIVITIES} WHERE id = $1`, [id]);
        if (result.rowCount === 0) return res.status(404).send('Activity not found');
        const row = result.rows[0];
        // enforce business scoping for non-super-admins
        if (req.session && req.session.userId && !(await isSuperAdmin(req))) {
            const bid = req.session.businessId || null;
            if (String(row.business_id || '') !== String(bid || '')) return res.status(403).json({ error: 'Forbidden - access denied' });
        }
        const mapped = {
            ...row,
            programId: row.program_id,
            startDate: row.start_date,
            endDate: row.end_date,
            responseType: row.response_type || row.responsetype || null,
            formDefinition: row.form_definition || null,
        };
        res.json(mapped);
    } catch (e) { console.error('Failed to fetch activity', e); res.status(500).send(e.message); }
});

// Public: list activities with program and standalone form path for sharing/embed
app.get('/api/public/activity_links', async (req, res) => {
    try {
        const r = await pool.query(`SELECT a.id, a.title, a.program_id, p.name as program_name FROM ${tables.ACTIVITIES} a LEFT JOIN ${tables.PROGRAMS} p ON p.id = a.program_id ORDER BY a.created_at DESC`);
        const rows = (r.rows || []).map(row => ({
            id: row.id,
            title: row.title,
            program_name: row.program_name || null,
            // path to be used with client origin + path (HashRouter expects '#/standalone/fill/:id')
            path: `/#/standalone/fill/${row.id}`
        }));
        res.json(rows);
    } catch (e) { console.error(e); res.status(500).json({ error: String(e) }); }
});

app.post('/api/activities', async (req, res) => {
    const { title, programId, details, startDate, endDate, category, status, questions, id, createdBy } = req.body;
    try {
        if (id) {
            const result = await pool.query(
                `UPDATE ${tables.ACTIVITIES} SET title=$1, subtitle=$2, program_id=$3, details=$4, start_date=$5, end_date=$6, response_type=$7, category=$8, status=$9, created_by=$10 WHERE id=$11 RETURNING *`,
                [title, req.body.subtitle || null, programId, details, startDate, endDate, req.body.responseType || req.body.response_type || null, category, status, createdBy, id]
            );
            const r = result.rows[0];
            // Persist questions from form definition into questions table
            await syncQuestions(r.id, questions || []);
            res.json({ ...r, programId: r.program_id, startDate: r.start_date, endDate: r.end_date });
        } else {
            // attach business_id from session unless super-admin provided
            let businessId = null;
            if (req.session && req.session.userId) {
                if (await isSuperAdmin(req) && req.body.businessId) businessId = req.body.businessId;
                else businessId = req.session.businessId || null;
            }
            const result = await pool.query(
                `INSERT INTO ${tables.ACTIVITIES} (title, subtitle, program_id, details, start_date, end_date, response_type, category, status, created_by, business_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [title, req.body.subtitle || null, programId, details, startDate, endDate, req.body.responseType || req.body.response_type || null, category, status, createdBy, businessId]
            );
            const r = result.rows[0];
            // Persist questions from form definition into questions table
            await syncQuestions(r.id, questions || []);
            res.json({ ...r, programId: r.program_id, startDate: r.start_date, endDate: r.end_date });
        }
    } catch (e) { res.status(500).send(e.message); }
});

app.put('/api/activities/:id/form', async (req, res) => {
    const { questions, formDefinition } = req.body || {};
    try {
        // If a full formDefinition is provided, persist it (so section-level settings like
        // isRepeatable and groupName are stored) and sync questions from that structure.
        if (formDefinition) {
            await syncQuestions(req.params.id, formDefinition);
            await pool.query(`UPDATE ${tables.ACTIVITIES} SET form_definition = $1 WHERE id = $2`, [formDefinition, req.params.id]);
            const updated = (await pool.query(`SELECT * FROM ${tables.ACTIVITIES} WHERE id = $1`, [req.params.id])).rows[0];
            return res.json({ ...updated, formDefinition: updated.form_definition });
        }

        // Backwards-compatible: if only questions array provided, sync and build compact formDefinition
        await syncQuestions(req.params.id, questions || []);
        const pagesMap = {};
        for (const q of (questions || [])) {
            const page = q.pageName || q.page_name || q.page || 'Page 1';
            const section = q.sectionName || q.section_name || q.section || 'Section 1';
            pagesMap[page] = pagesMap[page] || {};
            pagesMap[page][section] = pagesMap[page][section] || [];
            // keep necessary fields for formDefinition
            pagesMap[page][section].push({
                id: q.id,
                questionText: q.questionText || q.question_text || q.text || null,
                questionHelper: q.questionHelper || q.question_helper || q.helper || null,
                answerType: q.answerType || q.answer_type || q.type || null,
                columnSize: q.columnSize || q.column_size || null,
                required: q.required || false,
                status: q.status || 'Active',
                options: q.options || null,
                metadata: q.metadata || null,
                fieldName: q.fieldName || q.field_name || null
            });
        }
        const pages = Object.entries(pagesMap).map(([pName, sectionsObj], idx) => ({
            id: `page${idx + 1}`,
            name: pName,
            sections: Object.entries(sectionsObj).map(([sName, qs], sidx) => ({ id: `sec${sidx + 1}`, name: sName, questions: qs }))
        }));
        const compactFormDefinition = { id: `fd-${req.params.id}`, activityId: Number(req.params.id), pages };
        await pool.query(`UPDATE ${tables.ACTIVITIES} SET form_definition = $1 WHERE id = $2`, [compactFormDefinition, req.params.id]);
        const updated = (await pool.query(`SELECT * FROM ${tables.ACTIVITIES} WHERE id = $1`, [req.params.id])).rows[0];
        res.json({ ...updated, formDefinition: updated.form_definition });
    } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/activities/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query(`DELETE FROM ${tables.ACTIVITIES} WHERE id = $1`, [req.params.id]);
        res.sendStatus(200);
    } catch (e) { res.status(500).send(e.message); }
});

// Facilities
app.get('/api/facilities', async (req, res) => {
    try {
        const businessId = req.session?.businessId || null;
        const userCheck = req.session?.userId ? (await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [req.session.userId])).rows[0] : null;
        const isSuperAdmin = userCheck && String(userCheck.role || '').toLowerCase().includes('super');
        
        let q = `SELECT * FROM ${tables.FACILITIES}`;
        const params = [];
        
        // Super-admin without business context sees all, otherwise filter by business_id
        if (!isSuperAdmin || businessId) {
            q += ' WHERE business_id = $1 OR business_id IS NULL';
            params.push(businessId);
        }
        
        q += ' ORDER BY name ASC';
        const result = await pool.query(q, params);
        res.json(result.rows);
    } catch (e) { res.status(500).send(e.message); }
});

// Public read-only facilities endpoint (N2 milestone): enforces banding and publication lag
app.get('/api/public/facilities', async (req, res) => {
    try {
        // Prefer real facilities from DB; fall back to synthetic file if DB empty
        let synth = [];
        try {
            const fres = await pool.query(`SELECT id, name, state, lga, address, category, location, show_on_map FROM ${tables.FACILITIES} ORDER BY name ASC`);
            if (fres.rows && fres.rows.length) {
                synth = fres.rows.map(r => ({ id: r.id, name: r.name, state: r.state, lga: r.lga, address: r.address, category: r.category, location: r.location, show_on_map: r.show_on_map }));
            } else {
                const synthPath = path.join(process.cwd(), 'public', 'synthetic-facilities.json');
                try { const txt = await fs.promises.readFile(synthPath, 'utf8'); synth = JSON.parse(txt || '[]'); } catch (e) { console.warn('Failed to read synthetic facilities file:', e && e.message ? e.message : e); synth = []; }
            }
        } catch (e) {
            console.warn('Failed to load facilities from DB, falling back to synthetic. Error:', e && e.message ? e.message : e);
            const synthPath = path.join(process.cwd(), 'public', 'synthetic-facilities.json');
            try { const txt = await fs.promises.readFile(synthPath, 'utf8'); synth = JSON.parse(txt || '[]'); } catch (err) { synth = []; }
        }

        // Load indicators metadata to determine which fields are banded
        const indicatorsPath = path.join(process.cwd(), 'public', 'metadata', 'indicators.json');
        let indicatorsMeta = [];
        try {
            const txt = await fs.promises.readFile(indicatorsPath, 'utf8');
            indicatorsMeta = JSON.parse(txt || '[]');
        } catch (e) { indicatorsMeta = []; }

        // Publication lag (days) configured via env or default to 7 days
        const lagDays = Number(process.env.PUBLICATION_LAG_DAYS || process.env.PUB_LAG_DAYS || 7);
        const publishedAt = new Date(Date.now() - Math.max(0, lagDays) * 24 * 60 * 60 * 1000).toISOString();

        // Determine requesting user's role (if authenticated). Controllers can see more.
        let requesterRole = null;
        try {
            if (req.session && req.session.userId) {
                const r = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1 LIMIT 1`, [req.session.userId]);
                if (r.rows && r.rows.length) requesterRole = (r.rows[0].role || null);
            }
        } catch (e) { requesterRole = null; }

        // Map function to enforce banding and redact sensitive fields
        const computeBandFromTelemetry = (value) => {
            // Accept either object { band } or numeric uptime
            if (value && typeof value === 'object' && value.band) return String(value.band).toLowerCase();
            const n = Number(value);
            if (!isNaN(n)) {
                if (n >= 90) return 'green';
                if (n >= 70) return 'yellow';
                return 'red';
            }
            return 'unknown';
        };

        const safeFacilities = synth.map(f => {
            // parse location 'lat,lng' if available
            let lat = null, lng = null;
            try {
                if (f.location && typeof f.location === 'string') {
                    const parts = String(f.location).split(',').map(s => s.trim()).filter(Boolean);
                    if (parts.length >= 2) { lat = Number(parts[0]); lng = Number(parts[1]); }
                } else if (f.lat !== undefined && f.lng !== undefined) {
                    lat = f.lat; lng = f.lng;
                }
            } catch (e) { lat = null; lng = null; }

            // Build minimal indicators object placeholder; detailed computed indicators are served by /api/indicators endpoints
            const safeIndicators = {};
            for (const ind of indicatorsMeta) {
                const key = ind.dataType || ind.id;
                safeIndicators[key] = { value: null };
            }

            const showEvidence = requesterRole && String(requesterRole).toLowerCase().includes('controller');
            const evidence = showEvidence ? (f.evidence || {}) : { sampling_note: f.evidence?.sampling_note || 'redacted', certificates: [] };

            return {
                id: f.id,
                name: f.name,
                lat,
                lng,
                location: f.location || null,
                show_on_map: (f.show_on_map === undefined || f.show_on_map === null) ? true : Boolean(f.show_on_map),
                state: f.state || null,
                lga: f.lga || null,
                address: f.address || null,
                category: f.category || null,
                indicators: safeIndicators,
                evidence_preview: evidence,
                publishedAt,
                isLagged: true
            };
        });

        res.json({ publishedAt, lagDays, facilities: safeFacilities });
    } catch (e) {
        console.error('public/facilities error', e);
        res.status(500).json({ error: 'Failed to load public facilities' });
    }
});

// Given program/activity/user filters, return matching facility ids (used by frontend map filters)
app.post('/api/public/facility_ids_for_filters', async (req, res) => {
    try {
        const { programIds, activityIds, userIds } = req.body || {};
        const conds = [];
        const params = [];
        let idx = 1;

        if (Array.isArray(programIds) && programIds.length) {
            conds.push(`a.program_id = ANY($${idx}::int[])`);
            params.push(programIds.map(Number)); idx++;
        }
        if (Array.isArray(activityIds) && activityIds.length) {
            conds.push(`ar.activity_id = ANY($${idx}::int[])`);
            params.push(activityIds.map(Number)); idx++;
        }
        if (Array.isArray(userIds) && userIds.length) {
            conds.push(`(ar.reported_by = ANY($${idx}::int[]) OR ar.user_id = ANY($${idx}::int[]))`);
            params.push(userIds.map(Number)); idx++;
        }

        if (conds.length === 0) return res.json([]);

        const where = 'WHERE ' + conds.join(' OR ');
        const q = `SELECT DISTINCT ar.facility_id FROM ${tables.ACTIVITY_REPORTS} ar LEFT JOIN ${tables.ACTIVITIES} a ON a.id = ar.activity_id ${where}`;
        const r = await pool.query(q, params);
        const ids = (r.rows || []).map(rr => rr.facility_id).filter(Boolean);
        res.json({ facilityIds: ids });
    } catch (e) { console.error('facility_ids_for_filters error', e); res.status(500).json({ error: 'Failed to compute facility ids' }); }
});

// Public: fetch recent reports+answers for a facility, plus questions marked to show on map for those activities
app.get('/api/public/facility_map_answers', async (req, res) => {
    try {
        const facilityId = Number(req.query.facilityId || req.query.facility_id);
        if (!facilityId) return res.status(400).json({ error: 'Missing facilityId' });

        // fetch recent reports for this facility
        const r = await pool.query(`SELECT * FROM ${tables.ACTIVITY_REPORTS} WHERE facility_id = $1 ORDER BY submission_date DESC LIMIT 20`, [facilityId]);
        const reports = r.rows || [];

        const out = [];
        for (const rep of reports) {
            const reportId = rep.id;
            const activityId = rep.activity_id;
            // fetch answers for this report and include reviewer fields when present
            const ares = await pool.query(`SELECT question_id, answer_value, reviewers_comment, quality_improvement_followup FROM ${tables.ANSWERS} WHERE report_id = $1`, [reportId]);
            const answers = {};
            for (const a of ares.rows) {
                let val = a.answer_value;
                if (typeof val === 'string') {
                    try { val = JSON.parse(val); } catch (e) { /* keep as string */ }
                }
                answers[String(a.question_id)] = {
                    value: val,
                    reviewers_comment: (a.reviewers_comment || null),
                    quality_improvement_followup: (a.quality_improvement_followup || null)
                };
            }

            // fetch questions for the activity that have metadata.show_on_map = true
            let showQs = [];
            try {
                const qres = await pool.query(`SELECT id, question_text, page_name, section_name, metadata FROM ${tables.QUESTIONS} WHERE activity_id = $1`, [activityId]);
                for (const q of qres.rows) {
                    let md = q.metadata || null;
                    if (typeof md === 'string') {
                        try { md = JSON.parse(md); } catch (e) { md = null; }
                    }
                    // normalize show_on_map flag and optional roles list
                    const showFlag = md && (md.show_on_map === true || md.show_on_map === 'true');
                    const showRoles = (md && (md.show_on_map_roles || md.show_on_map_by)) ? (md.show_on_map_roles || md.show_on_map_by) : null;
                    if (showFlag) {
                        showQs.push({ id: String(q.id), questionText: q.question_text || null, pageName: q.page_name || null, sectionName: q.section_name || null, metadata: md, show_on_map_roles: Array.isArray(showRoles) ? showRoles : (typeof showRoles === 'string' ? [showRoles] : []) });
                    }
                }
            } catch (e) { /* ignore question fetch errors */ }

            // include reviewers_report and assigned_validator (if any) with the report
            out.push({ reportId: reportId, activityId: activityId, submissionDate: rep.submission_date, answers, showOnMapQuestions: showQs, reviewers_report: rep.reviewers_report || null, assigned_validator: rep.assigned_validator || null, overall_score: rep.overall_score || null });
        }

        res.json({ facilityId, reports: out });
    } catch (e) {
        console.error('facility_map_answers error', e);
        res.status(500).json({ error: 'Failed to fetch facility map answers' });
    }
});

// Public aggregates (Public Lite Aggregates) — banded summary and lag indicator
app.get('/api/public/aggregates', async (req, res) => {
    try {
        const synthPath = path.join(process.cwd(), 'public', 'synthetic-facilities.json');
        let synth = [];
        try { const txt = await fs.promises.readFile(synthPath, 'utf8'); synth = JSON.parse(txt || '[]'); } catch (e) { synth = []; }
        const indicatorsPath = path.join(process.cwd(), 'public', 'metadata', 'indicators.json');
        let indicatorsMeta = [];
        try { const txt = await fs.promises.readFile(indicatorsPath, 'utf8'); indicatorsMeta = JSON.parse(txt || '[]'); } catch (e) { indicatorsMeta = []; }

        // Compute simple band distribution for primary banded indicator (prefer energy_resilience)
        const primaryIndicator = indicatorsMeta.find(i => i.dataType === 'energy_resilience') || indicatorsMeta[0];
        const key = primaryIndicator ? (primaryIndicator.dataType || primaryIndicator.id) : null;
        const counts = { green: 0, yellow: 0, red: 0, unknown: 0 };
        for (const f of synth) {
            const raw = key && f.indicators ? f.indicators[key] : null;
            let band = 'unknown';
            if (raw && typeof raw === 'object' && raw.band) band = String(raw.band).toLowerCase();
            else if (typeof raw === 'number') { band = raw >= 90 ? 'green' : (raw >= 70 ? 'yellow' : 'red'); }
            counts[band] = (counts[band] || 0) + 1;
        }
        const total = Math.max(1, synth.length);
        // Determine overall band as majority
        const overall = counts.green >= counts.yellow && counts.green >= counts.red ? 'green' : (counts.yellow >= counts.green && counts.yellow >= counts.red ? 'yellow' : 'red');

        const lagDays = Number(process.env.PUBLICATION_LAG_DAYS || process.env.PUB_LAG_DAYS || 7);
        const publishedAt = new Date(Date.now() - Math.max(0, lagDays) * 24 * 60 * 60 * 1000).toISOString();

        return res.json({ indicator: key, counts, total: synth.length, overallBand: overall, publishedAt, isLagged: true });
    } catch (e) {
        console.error('public/aggregates error', e);
        res.status(500).json({ error: 'Failed to compute aggregates' });
    }
});

app.post('/api/facilities', requireAdmin, async (req, res) => {
    const { name, state, lga, address, category, id, location, show_on_map, ...customFields } = req.body;
    try {
        // Separate custom fields (any field not in the standard set)
        const standardFields = ['name', 'state', 'lga', 'address', 'category', 'id', 'location', 'show_on_map', 'business_id'];
        const custom = Object.fromEntries(
            Object.entries(req.body).filter(([key]) => !standardFields.includes(key))
        );
        const customFieldsJson = Object.keys(custom).length > 0 ? JSON.stringify(custom) : null;

        if (id) {
            const result = await pool.query(
                `UPDATE ${tables.FACILITIES} SET name=$1, state=$2, lga=$3, address=$4, category=$5, location=$6, show_on_map=$7, custom_fields=$8 WHERE id=$9 RETURNING *`,
                [name, state, lga, address, category, location || null, (show_on_map === undefined ? true : show_on_map), customFieldsJson, id]
            );
            res.json(result.rows[0]);
        } else {
            let businessId = null;
            if (req.session && req.session.userId) {
                if (await isSuperAdmin(req) && req.body.businessId) businessId = req.body.businessId;
                else businessId = req.session.businessId || null;
            }
            const result = await pool.query(
                `INSERT INTO ${tables.FACILITIES} (name, state, lga, address, category, location, show_on_map, custom_fields, business_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                [name, state, lga, address, category, location || null, (show_on_map === undefined ? true : show_on_map), customFieldsJson, businessId]
            );
            res.json(result.rows[0]);
        }
    } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/facilities/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query(`DELETE FROM ${tables.FACILITIES} WHERE id = $1`, [req.params.id]);
        res.sendStatus(200);
    } catch (e) { res.status(500).send(e.message); }
});

// Users
app.get('/api/users', async (req, res) => {
    try {
        // Scope users to business for non-super-admins
        let q = `SELECT * FROM ${tables.USERS}`;
        const params = [];
        if (req.session && req.session.userId && !(await isSuperAdmin(req))) {
            q += ' WHERE business_id = $1';
            params.push(req.session.businessId || null);
        }
        q += ' ORDER BY created_at DESC';
        const result = await pool.query(q, params);
        const mapped = result.rows.map(r => ({
            ...r,
            firstName: r.first_name,
            lastName: r.last_name,
            profileImage: r.profile_image || null,
            businessId: r.business_id || null
        }));
        res.json(mapped);
    } catch (e) { res.status(500).send(e.message); }
});

// Create or update user
app.post('/api/users', async (req, res) => {
    const { id, firstName, lastName, email, role, status, phoneNumber, password, facilityId, profileImage, ...customFieldsRaw } = req.body;
    try {
        // Separate custom fields (any field not in the standard set)
        const standardFields = ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'phoneNumber', 'password', 'facilityId', 'profileImage', 'business_id'];
        const custom = Object.fromEntries(
            Object.entries(req.body).filter(([key]) => !standardFields.includes(key))
        );
        const customFieldsJson = Object.keys(custom).length > 0 ? JSON.stringify(custom) : null;

        // If password provided, hash it before persisting
        let hashedPassword = null;
        if (password) {
            try {
                hashedPassword = await bcrypt.hash(password, 10);
            } catch (e) {
                console.error('Failed to hash provided password for user:', e);
                // fallback to storing plaintext (not ideal) if hashing fails
                hashedPassword = password;
            }
        }

        // helper: determine if actor is admin (available for create/update checks)
        const actorId = req.session && req.session.userId ? req.session.userId : null;
        const actorIsAdmin = async () => {
            if (!actorId) return false;
            try {
                const r = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1`, [actorId]);
                if (r.rows.length > 0) {
                    const role = (r.rows[0].role || '').toString().toLowerCase();
                    if (role === 'admin' || role === 'super-admin' || role === 'super_admin') return true;
                }
                const rr = await pool.query(`SELECT r.name FROM ${tables.USER_ROLES} ur JOIN ${tables.ROLES} r ON ur.role_id = r.id WHERE ur.user_id = $1`, [actorId]);
                for (const row of rr.rows) { if (row && row.name && row.name.toString().toLowerCase() === 'admin') return true; }
            } catch (e) { /* ignore */ }
            return false;
        };

        // Normalize admin role to 'Admin' (capital A) for consistent permissions
        let normalizedRole = role;
        if (role !== undefined) {
            normalizedRole = normalizeAdminRole(role);
        }

        if (id) {
            // fetch existing user for diff and existence check
            const existingRes = await pool.query(`SELECT * FROM ${tables.USERS} WHERE id = $1`, [id]);
            if (existingRes.rows.length === 0) return res.status(404).send('User not found');
            const existing = existingRes.rows[0];

            // If attempting to change role, ensure actor is admin
            if (role !== undefined) {
                const ok = await actorIsAdmin();
                if (!ok) return res.status(403).json({ error: 'Forbidden - only admins can change roles' });
                // Normalize admin role to 'Admin' (capital A) for consistent permissions
                role = normalizeAdminRole(role);
            }

            // Build dynamic update so we only change fields that are provided.
            const updates = [];
            const values = [];
            let idx = 1;
            if (firstName !== undefined) { updates.push(`first_name=$${idx++}`); values.push(firstName); }
            if (lastName !== undefined) { updates.push(`last_name=$${idx++}`); values.push(lastName); }
            if (email !== undefined) { updates.push(`email=$${idx++}`); values.push(email); }
            if (status !== undefined) { updates.push(`status=$${idx++}`); values.push(status); }
            if (facilityId !== undefined) {
                // only admins may change facility assignment
                const ok = await actorIsAdmin();
                if (!ok) return res.status(403).json({ error: 'Forbidden - only admins can change facility assignment' });
                updates.push(`facility_id=$${idx++}`); values.push(facilityId);
            }
            if (profileImage !== undefined) { updates.push(`profile_image=$${idx++}`); values.push(profileImage); }
            // Only change role if explicitly provided (admin-checked above)
            if (normalizedRole !== undefined) { updates.push(`role=$${idx++}`); values.push(normalizedRole); }
            // Only change password if provided
            if (password) { updates.push(`password=$${idx++}`); values.push(hashedPassword); }
            // Handle custom fields
            if (customFieldsJson !== null) { updates.push(`custom_fields=$${idx++}`); values.push(customFieldsJson); }

            if (updates.length === 0) {
                const u = existing;
                return res.json({ id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, role: u.role, status: u.status, profileImage: u.profile_image || null, customFields: u.custom_fields ? JSON.parse(u.custom_fields) : null });
            }

            const sql = `UPDATE ${tables.USERS} SET ${updates.join(', ')} WHERE id=$${idx} RETURNING *`;
            values.push(id);
            const result = await pool.query(sql, values);
            const u = result.rows[0];

            // audit: record what changed (omit sensitive values like password contents)
            try {
                await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.AUDIT_EVENTS} (
                    id SERIAL PRIMARY KEY,
                    actor_user_id INTEGER,
                    target_user_id INTEGER,
                    action TEXT,
                    details JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )`);
                const changes = {};
                if (firstName !== undefined && existing.first_name !== firstName) changes.first_name = { before: existing.first_name, after: firstName };
                if (lastName !== undefined && existing.last_name !== lastName) changes.last_name = { before: existing.last_name, after: lastName };
                if (email !== undefined && existing.email !== email) changes.email = { before: existing.email, after: email };
                if (status !== undefined && existing.status !== status) changes.status = { before: existing.status, after: status };
                if (facilityId !== undefined && String(existing.facility_id) !== String(facilityId)) changes.facility_id = { before: existing.facility_id, after: facilityId };
                if (profileImage !== undefined && existing.profile_image !== profileImage) changes.profile_image = { before: existing.profile_image, after: profileImage };
                if (role !== undefined && existing.role !== role) changes.role = { before: existing.role, after: role };
                if (password) changes.password_changed = true;
                await pool.query(`INSERT INTO ${tables.AUDIT_EVENTS} (actor_user_id, target_user_id, action, details) VALUES ($1,$2,$3,$4)`, [actorId || null, u.id, 'update', Object.keys(changes).length ? changes : { updated: true }]);
            } catch (e) { console.error('Failed to write audit event for user update', e); }

            // send notification email if smtp configured
            try {
                const businessId = req.session?.businessId || null;
                const sres = await pool.query("SELECT value FROM ${tables.SETTINGS} WHERE key = 'smtp' AND business_id = $1", [businessId]);
                const smtp = sres.rows[0] ? sres.rows[0].value : null;
                if (smtp) {
                    try {
                        const nm = await import('nodemailer');
                        const transporter = nm.createTransport(smtp);
                        const adminList = (smtp.admins && Array.isArray(smtp.admins)) ? smtp.admins.join(',') : (smtp.admins || smtp.adminEmail || null);
                        const toList = [u.email];
                        if (adminList) toList.push(adminList);
                        const subject = 'Account updated';
                        const text = `Hello ${u.first_name || ''},\n\nYour account has been updated. If you did not expect this, contact support.`;
                        await transporter.sendMail({ from: smtp.from || smtp.user || 'no-reply@example.com', to: toList.join(','), subject, text });
                    } catch (e) { console.error('Failed to send user-update email', e); }
                }
            } catch (e) { console.error('Failed to load smtp settings for user-update notification', e); }

            res.json({ id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, role: u.role, status: u.status, profileImage: u.profile_image || null, customFields: u.custom_fields ? JSON.parse(u.custom_fields) : null });
        } else {
            // only admins may create new users
            const okCreate = await actorIsAdmin();
            if (!okCreate) return res.status(403).json({ error: 'Forbidden - only admins can create users' });

            // Determine business for the created user (admins create within their business unless super-admin)
            let businessIdForNewUser = null;
            if (req.session && req.session.userId) {
                if (await isSuperAdmin(req) && req.body.businessId) businessIdForNewUser = req.body.businessId;
                else businessIdForNewUser = req.session.businessId || null;
            }
            const result = await pool.query(
                `INSERT INTO ${tables.USERS} (first_name, last_name, email, role, status, password, facility_id, profile_image, custom_fields, business_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [firstName, lastName, email, normalizedRole, status, hashedPassword || null, facilityId || null, profileImage || null, customFieldsJson, businessIdForNewUser]
            );
            const u = result.rows[0];
            // send welcome email if smtp configured
            try {
                const sres = await pool.query("SELECT value FROM ${tables.SETTINGS} WHERE key = 'smtp' AND business_id = $1", [businessIdForNewUser]);
                const smtp = sres.rows[0] ? sres.rows[0].value : null;
                if (smtp) {
                    try {
                        const nm = await import('nodemailer');
                        const transporter = nm.createTransport(smtp);
                        const adminList = (smtp.admins && Array.isArray(smtp.admins)) ? smtp.admins.join(',') : (smtp.admins || smtp.adminEmail || null);
                        const toList = [u.email];
                        if (adminList) toList.push(adminList);
                        const subject = 'Account created';
                        let text = `Hello ${u.first_name || ''},\n\nAn account has been created for you.`;
                        if (!password) text += '\n\nNo password was provided. You can set a password using the password reset flow.';
                        text += '\n\nIf you did not expect this, contact support.';
                        await transporter.sendMail({ from: smtp.from || smtp.user || 'no-reply@example.com', to: toList.join(','), subject, text });
                    } catch (e) { console.error('Failed to send user-create email', e); }
                }
            } catch (e) { console.error('Failed to load smtp settings for user-create notification', e); }

            // audit: user created
            try {
                const actorId = req.session && req.session.userId ? req.session.userId : null;
                await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.AUDIT_EVENTS} (
                    id SERIAL PRIMARY KEY,
                    actor_user_id INTEGER,
                    target_user_id INTEGER,
                    action TEXT,
                    details JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )`);
                const details = { created: true, role: u.role, email: u.email, provided_password: !!password };
                await pool.query(`INSERT INTO ${tables.AUDIT_EVENTS} (actor_user_id, target_user_id, action, details) VALUES ($1,$2,$3,$4)`, [actorId || null, u.id, 'create', details]);
            } catch (e) { console.error('Failed to write audit event for user create', e); }

            res.json({ id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, role: u.role, status: u.status, profileImage: u.profile_image || null, customFields: u.custom_fields ? JSON.parse(u.custom_fields) : null });
        }
    } catch (e) { console.error(e); res.status(500).send(e.message); }
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        // fetch user for audit
        const ures = await pool.query(`SELECT * FROM ${tables.USERS} WHERE id = $1`, [id]);
        const target = ures.rows.length ? ures.rows[0] : null;
        // remove role assignments
        await pool.query(`DELETE FROM ${tables.USER_ROLES} WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM ${tables.USERS} WHERE id = $1`, [id]);
        // audit deletion
        try {
            const actorId = req.session && req.session.userId ? req.session.userId : null;
            await pool.query(`CREATE TABLE IF NOT EXISTS ${tables.AUDIT_EVENTS} (
                id SERIAL PRIMARY KEY,
                actor_user_id INTEGER,
                target_user_id INTEGER,
                action TEXT,
                details JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            )`);
            const details = { deleted: true, email: target ? target.email : null, role: target ? target.role : null };
            await pool.query(`INSERT INTO ${tables.AUDIT_EVENTS} (actor_user_id, target_user_id, action, details) VALUES ($1,$2,$3,$4)`, [actorId || null, id, 'delete', details]);
        } catch (e) { console.error('Failed to write audit event for user delete', e); }

        res.json({ ok: true });
    } catch (e) { console.error('Failed to delete user', e); res.status(500).json({ error: 'Failed to delete user' }); }
});

// Reports
app.get('/api/reports', async (req, res) => {
    try {
        // If requester is a validator, only return reports assigned to them
        const params = [];
        const whereParts = [];
        try {
            if (req.session && req.session.userId) {
                const r = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1 LIMIT 1`, [req.session.userId]);
                if (r.rows.length > 0 && String(r.rows[0].role || '').toLowerCase() === 'validator') {
                    whereParts.push('assigned_validator = $' + (params.length + 1));
                    params.push(req.session.userId);
                }
                // enforce business scoping unless super-admin
                if (!(await isSuperAdmin(req))) {
                    whereParts.push('business_id = $' + (params.length + 1));
                    params.push(req.session.businessId || null);
                }
            }
        } catch (e) { /* ignore role-check errors */ }

        const whereClause = whereParts.length ? (' WHERE ' + whereParts.join(' AND ')) : '';
        const q = `SELECT * FROM ${tables.ACTIVITY_REPORTS}${whereClause} ORDER BY submission_date DESC`;
        const result = await pool.query(q, params);
        const mapped = result.rows.map(r => ({
            ...r,
            activityId: r.activity_id,
            userId: r.user_id,
            facilityId: r.facility_id,
            submissionDate: r.submission_date,
            reviewersReport: r.reviewers_report,
            overallScore: r.overall_score,
            reportedBy: r.reported_by
        }));
        res.json(mapped);
    } catch (e) { res.status(500).send(e.message); }
});

// Get a single report by id
app.get('/api/reports/:id', async (req, res) => {
    try {
        const reportId = Number(req.params.id);
        if (!reportId) return res.status(400).send('Invalid id');
        const result = await pool.query(`SELECT * FROM ${tables.ACTIVITY_REPORTS} WHERE id = $1`, [reportId]);
        if (result.rowCount === 0) return res.status(404).send('Report not found');
        const r = result.rows[0];
        // enforce business scoping for non-super-admins
        if (req.session && req.session.userId && !(await isSuperAdmin(req))) {
            const bid = req.session.businessId || null;
            if (String(r.business_id || '') !== String(bid || '')) return res.status(403).json({ error: 'Forbidden - access denied' });
        }
        // If requester is a validator, ensure the report is assigned to them
        try {
            if (req.session && req.session.userId) {
                const rr = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1 LIMIT 1`, [req.session.userId]);
                if (rr.rows.length > 0 && String(rr.rows[0].role || '').toLowerCase() === 'validator') {
                    if (Number(r.assigned_validator || 0) !== Number(req.session.userId)) return res.status(403).json({ error: 'Forbidden - not assigned to you' });
                }
            }
        } catch (e) { /* ignore role-check errors */ }

        res.json({
            ...r,
            activityId: r.activity_id,
            userId: r.user_id,
            facilityId: r.facility_id,
            submissionDate: r.submission_date,
            reviewersReport: r.reviewers_report,
            overallScore: r.overall_score,
            reportedBy: r.reported_by
        });
    } catch (e) { res.status(500).send(e.message); }
});

// Generate PDF for a report (server-side). Requires 'puppeteer' to be installed.
app.get('/api/reports/:id/pdf', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        const rres = await pool.query(`SELECT * FROM ${tables.ACTIVITY_REPORTS} WHERE id = $1`, [id]);
        if (rres.rowCount === 0) return res.status(404).json({ error: 'Report not found' });
        const report = rres.rows[0];
        // fetch answers, questions and uploaded docs
        const [aRes, qRes, dRes] = await Promise.all([
            pool.query(`SELECT * FROM ${tables.ANSWERS} WHERE report_id = $1 ORDER BY id ASC`, [id]),
            pool.query(`SELECT * FROM ${tables.QUESTIONS} WHERE activity_id = $1`, [report.activity_id]),
            pool.query(`SELECT * FROM ${tables.UPLOADED_DOCS} WHERE report_id = $1`, [id])
        ]);
        const answers = aRes.rows || [];
        const questions = qRes.rows || [];
        const uploadedDocs = dRes.rows || [];

        // build maps for quick lookup (support various possible id fields)
        const qMap = {};
        for (const q of questions) {
            try {
                if (q.id !== undefined && q.id !== null) qMap[String(q.id)] = q;
                if (q.qid !== undefined && q.qid !== null) qMap[String(q.qid)] = q;
                if (q.question_id !== undefined && q.question_id !== null) qMap[String(q.question_id)] = q;
                if (q.field_name) qMap[String(q.field_name)] = q;
                if (q.fieldName) qMap[String(q.fieldName)] = q;
            } catch (e) { /* ignore malformed question rows */ }
        }
        const answersMap = {};
        for (const a of answers) {
            answersMap[String(a.question_id)] = (typeof a.answer_value === 'object') ? JSON.stringify(a.answer_value) : String(a.answer_value);
        }

        // fetch facility and reporter user for display (if available)
        let facility = null;
        try {
            if (report.facility_id) {
                const fres = await pool.query(`SELECT * FROM ${tables.FACILITIES} WHERE id = $1`, [report.facility_id]);
                if (fres.rowCount > 0) facility = fres.rows[0];
            }
        } catch (e) { /* ignore */ }
        let reportedByUser = null;
        try {
            if (report.reported_by) {
                const ures = await pool.query(`SELECT id, first_name, last_name, email FROM ${tables.USERS} WHERE id = $1`, [report.reported_by]);
                if (ures.rowCount > 0) reportedByUser = ures.rows[0];
            }
        } catch (e) { /* ignore */ }

        // Helper to sanitize potentially heavy/unsafe HTML snippets (strip iframes/videos/objects/scripts and large data: URLs)
        const sanitizeHtml = (raw) => {
            if (!raw) return '';
            try {
                let s = String(raw || '');
                s = s.replace(/<video[\s\S]*?<\/video>/gi, '');
                s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
                s = s.replace(/<object[\s\S]*?<\/object>/gi, '');
                s = s.replace(/<embed[\s\S]*?<\/embed>/gi, '');
                s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
                // strip extremely large data URLs (over ~5k chars) from src attributes
                s = s.replace(/src=(\"|\')(data:[^\"']{5000,})(\"|\')/gi, '');
                return s;
            } catch (e) { return String(raw || ''); }
        };

        // Helper to escape HTML
        const escapeHtml = (s) => {
            if (s === null || s === undefined) return '';
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };

        // By default return the original report summary HTML (title, status, score, reviewers comment, powerbi, submitted answers, uploaded files).
        // If the client explicitly requests the designed template via ?template=1, attempt to apply the saved template.
        const useTemplate = (req.query && (req.query.template === '1' || req.query.template === 'true' || req.query.useTemplate === '1'));
        const tplId = report.report_template_id || report.reportTemplateId || null;

        // Fetch any Power BI embed/link configured for this report or its activity so we can include it on the default summary page.
        let reportPowerbi = null;
        try {
            const pbRes = await pool.query(`SELECT * FROM ${tables.REPORTS_POWERBI} WHERE activity_reports_id = $1 ORDER BY id DESC LIMIT 1`, [id]);
            if (pbRes.rowCount > 0) reportPowerbi = pbRes.rows[0];
        } catch (e) { /* ignore */ }
        let activityPowerbi = null;
        try {
            const ap = await pool.query(`SELECT powerbi_url, powerbi_link_type, powerbi_mode FROM ${tables.ACTIVITIES} WHERE id = $1`, [report.activity_id]);
            if (ap.rowCount > 0) activityPowerbi = ap.rows[0];
        } catch (e) { /* ignore */ }

        let html = '';
        html += `<html><head><meta charset="utf-8"><title>Report ${report.id}</title><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}.report-filled{margin:6px 0}.powerbi-embed{margin:12px 0;padding:8px;border:1px solid #eee;background:#fafafa}</style></head><body>`;
        if (useTemplate && tplId) {
            try {
                const tplRes = await pool.query(`SELECT * FROM ${tables.REPORT_TEMPLATES} WHERE id = $1`, [tplId]);
                if (tplRes.rowCount > 0) {
                    const tpl = tplRes.rows[0];
                    let tplObj = {};
                    try { tplObj = typeof tpl.template_json === 'string' ? JSON.parse(tpl.template_json || '{}') : (tpl.template_json || {}); } catch (e) { tplObj = {}; }
                    let tplHtml = tplObj.html || '';
                    // perform placeholder substitution for question placeholders inserted by the canvas
                    // replace spans with data-qid attributes
                    tplHtml = tplHtml.replace(/<span[^>]*data-qid=["']?(\d+)["']?[^>]*>([\s\S]*?)<\/span>/gi, (m, qid, inner) => {
                        const answerRaw = answersMap[String(qid)] || '';
                        const answer = (answerRaw === null || answerRaw === undefined) ? '' : String(answerRaw);
                        return `<div class="report-filled">${escapeHtml(answer)}</div>`;
                    });

                    // replace uploaded table wrappers marked with data-upload-id and render full table if data exists
                    tplHtml = tplHtml.replace(/<div[^>]*data-upload-id=["']?(\d+)["']?[^>]*>[\s\S]*?<\/div>/gi, (m, did) => {
                        try {
                            const udRes = pool.query(`SELECT * FROM ${tables.UPLOADED_DOCS} WHERE id = $1`, [Number(did)]);
                            // udRes is a promise; but we are inside sync replace — handle by returning a placeholder and fill afterwards
                            return `__UPLOADED_TABLE_PLACEHOLDER_${did}__`;
                        } catch (e) { return `<div>Uploaded table ${did}</div>`; }
                    });

                    html += tplHtml;

                    // now fill uploaded table placeholders synchronously by querying DB for each found placeholder
                    // find placeholders
                    const upMatches = html.match(/__UPLOADED_TABLE_PLACEHOLDER_(\d+)__/g) || [];
                    for (const ph of upMatches) {
                        const mid = ph.replace(/__UPLOADED_TABLE_PLACEHOLDER_(\d+)__/, '$1');
                        try {
                            const udRes2 = await pool.query(`SELECT * FROM ${tables.UPLOADED_DOCS} WHERE id = $1`, [Number(mid)]);
                            if (udRes2.rowCount === 0) {
                                html = html.replace(ph, `<div>Uploaded table ${mid} not found</div>`);
                                continue;
                            }
                            const doc = udRes2.rows[0];
                            const rows = Array.isArray(doc.file_content) ? doc.file_content : [];
                            if (rows.length === 0) { html = html.replace(ph, `<div>No data for uploaded table ${mid}</div>`); continue; }
                            const cols = Object.keys(rows[0] || {});
                            let table = `<div class="uploaded-table-wrapper"><table style="border-collapse: collapse; width:100%;"><thead><tr>`;
                            for (const c of cols) table += `<th style="border:1px solid #ddd;padding:6px;background:#f7f7f7;text-align:left">${escapeHtml(c)}</th>`;
                            table += `</tr></thead><tbody>`;
                            for (const r of rows) {
                                table += '<tr>';
                                for (const c of cols) {
                                    let v = r && typeof r === 'object' && (r[c] !== undefined && r[c] !== null) ? String(r[c]) : '';
                                    table += `<td style="border:1px solid #ddd;padding:6px">${escapeHtml(v)}</td>`;
                                }
                                table += '</tr>';
                            }
                            table += `</tbody></table></div>`;
                            html = html.replace(ph, table);
                        } catch (e) {
                            html = html.replace(ph, `<div>Failed to render uploaded table ${mid}</div>`);
                        }
                    }

                } else {
                    // template not found; fall back to simple report view below
                    // we'll let execution continue to the summary fallback
                    tplHtml = null;
                }
            } catch (e) {
                console.error('Failed to apply template for report PDF', e);
                // failed to apply template, continue to summary fallback
                tplHtml = null;
            }
            if (tplHtml) {
                html += tplHtml;

                // now fill uploaded table placeholders synchronously by querying DB for each found placeholder
                const upMatches = html.match(/__UPLOADED_TABLE_PLACEHOLDER_(\d+)__/g) || [];
                for (const ph of upMatches) {
                    const mid = ph.replace(/__UPLOADED_TABLE_PLACEHOLDER_(\d+)__/, '$1');
                    try {
                        const udRes2 = await pool.query(`SELECT * FROM ${tables.UPLOADED_DOCS} WHERE id = $1`, [Number(mid)]);
                        if (udRes2.rowCount === 0) {
                            html = html.replace(ph, `<div>Uploaded table ${mid} not found</div>`);
                            continue;
                        }
                        const doc = udRes2.rows[0];
                        const rows = Array.isArray(doc.file_content) ? doc.file_content : [];
                        if (rows.length === 0) { html = html.replace(ph, `<div>No data for uploaded table ${mid}</div>`); continue; }
                        const cols = Object.keys(rows[0] || {});
                        let table = `<div class="uploaded-table-wrapper"><table style="border-collapse: collapse; width:100%;"><thead><tr>`;
                        for (const c of cols) table += `<th style="border:1px solid #ddd;padding:6px;background:#f7f7f7;text-align:left">${escapeHtml(c)}</th>`;
                        table += `</tr></thead><tbody>`;
                        for (const r of rows) {
                            table += '<tr>';
                            for (const c of cols) {
                                let v = r && typeof r === 'object' && (r[c] !== undefined && r[c] !== null) ? String(r[c]) : '';
                                table += `<td style="border:1px solid #ddd;padding:6px">${escapeHtml(v)}</td>`;
                            }
                            table += '</tr>';
                        }
                        table += `</tbody></table></div>`;
                        html = html.replace(ph, table);
                    } catch (e) {
                        html = html.replace(ph, `<div>Failed to render uploaded table ${mid}</div>`);
                    }
                }
                html += `</body></html>`;
            } else {
                // fall through to default summary rendering below
            }
        }

        // If we added a template HTML and returned it, skip the fallback summary. Otherwise build the original summary page.
        if (useTemplate && tplId && html.includes('</body></html>') && !html.includes('<h1>Report')) {
            // template was applied and HTML assembled — continue to PDF rendering with `html`
        } else {
            // no template — default tabular report with title/status/score/review and Power BI if configured
            const displayTitle = report.title || report.activity_title || (`Report ${report.id}`);
            html += `<h1>${escapeHtml(displayTitle)}</h1>`;
            // include facility name if available
            const facilityName = facility ? (facility.name || facility.facility_name || facility.name) : (report.facility_name || report.facility || '');
            html += `<p><strong>Report ID:</strong> ${escapeHtml(String(report.id))} &nbsp; <strong>Submitted:</strong> ${escapeHtml(new Date(report.submission_date).toLocaleString())}</p>`;
            html += `<p><strong>Facility:</strong> ${escapeHtml(facilityName || '—')} &nbsp; <strong>Status:</strong> ${escapeHtml(report.status || '')} &nbsp; <strong>Overall Score:</strong> ${escapeHtml(String(report.overall_score || ''))}</p>`;

            // include Power BI embed or link (prefer report-level, fallback to activity-level)
            const pb = reportPowerbi || (activityPowerbi && activityPowerbi.powerbi_url ? { powerbi_link: activityPowerbi.powerbi_url, link_type: activityPowerbi.powerbi_link_type || null } : null);
            if (pb && pb.powerbi_link) {
                const link = pb.powerbi_link;
                // Do not embed iframes in server PDF (can break PDF rendering). Show a safe link instead.
                html += `<div class="powerbi-embed"><strong>Power BI:</strong> <a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Open Power BI</a></div>`;
            }

            html += `<h2>Answers</h2><table><thead><tr><th>Page</th><th>Section</th><th>Question</th><th>Answer</th><th>Reviewer Comment</th><th>Followup</th></tr></thead><tbody>`;
            for (const a of answers) {
                const q = qMap[String(a.question_id)] || {};
                const questionText = q.questionText || q.question_text || q.label || String(a.question_id);
                const pageName = q.pageName || q.page_name || '';
                const sectionName = q.sectionName || q.section_name || '';
                const ans = (typeof a.answer_value === 'object') ? JSON.stringify(a.answer_value) : String(a.answer_value);
                html += `<tr><td>${escapeHtml(pageName)}</td><td>${escapeHtml(sectionName)}</td><td>${escapeHtml(questionText)}</td><td>${escapeHtml(ans)}</td><td>${escapeHtml(a.reviewers_comment || '')}</td><td>${escapeHtml(a.quality_improvement_followup || '')}</td></tr>`;
            }
            html += `</tbody></table>`;
            const reviewersHtml = sanitizeHtml(report.reviewers_report || report.reviewersReport || '');
            html += `<h2>Reviewer's Report</h2>`;
            if (reviewersHtml && String(reviewersHtml).trim()) html += `<div>${reviewersHtml}</div>`; else html += `<div><em>No review available</em></div>`;

            if (uploadedDocs && uploadedDocs.length) {
                html += `<h2>Uploaded Files</h2>`;
                for (const d of uploadedDocs) {
                    html += `<h3>${escapeHtml(d.filename || 'File')}</h3>`;
                    const rows = Array.isArray(d.file_content) ? d.file_content : [];
                    if (rows.length === 0) {
                        html += `<pre>${escapeHtml(JSON.stringify(d.file_content || d, null, 2))}</pre>`;
                    } else {
                        const cols = Object.keys(rows[0] || {});
                        html += `<table><thead><tr>`;
                        for (const c of cols) html += `<th>${escapeHtml(c)}</th>`;
                        html += `</tr></thead><tbody>`;
                        for (const r of rows) {
                            html += `<tr>`;
                            for (const c of cols) {
                                let v = r[c];
                                if (v === null || v === undefined) v = '';
                                else if (typeof v === 'object') v = JSON.stringify(v);
                                html += `<td>${escapeHtml(String(v))}</td>`;
                            }
                            html += `</tr>`;
                        }
                        html += `</tbody></table>`;
                    }
                }
            }
        }
        html += `</body></html>`;

        // Try to use puppeteer if available to render a PDF server-side
        try {
            const puppeteer = await import('puppeteer');
            const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
            await browser.close();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}.pdf"`);
            return res.send(pdfBuffer);
        } catch (e) {
            console.warn('puppeteer not available or failed:', e && e.message ? e.message : e);
            // fallback: return HTML so client can print/download
            res.setHeader('Content-Type', 'text/html');
            return res.send(html);
        }
    } catch (e) {
        console.error('Failed to generate report PDF', e);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Generate DOCX for a report by converting the applied template HTML to a .docx file
app.get('/api/reports/:id/docx', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        // Reuse the PDF route's HTML assembly logic by requesting the internal PDF route without puppeteer
        // Build HTML similar to /api/reports/:id/pdf but avoid duplication by calling the function or reassembling inline
        // For simplicity, call the same handler code path by requesting the pdf route without puppeteer using internal request
        const fetch = globalThis.fetch || require('node-fetch');
        const base = `${req.protocol}://${req.get('host')}`;
        const url = `${base}/api/reports/${id}/pdf?template=${req.query.template ? '1' : '0'}`;
        // Request the HTML fallback from the pdf endpoint (it may return PDF when puppeteer available; we prefer HTML)
        const r = await fetch(url, { headers: { Accept: 'text/html' } });
        let html = '';
        try { html = await r.text(); } catch (e) { html = '<html><body>Failed to build document</body></html>'; }
        // Try dynamic import of html-docx-js
        try {
            const htmlDocx = await import('html-docx-js');
            // html-docx-js exposes asBlob or asHTML depending on build; try common names
            let docxBuffer = null;
            try {
                const blob = htmlDocx.asBlob ? htmlDocx.asBlob(html) : (htmlDocx.default && htmlDocx.default.asBlob ? htmlDocx.default.asBlob(html) : null);
                if (blob) {
                    // blob may be ArrayBuffer-like
                    const arrayBuffer = await blob.arrayBuffer();
                    docxBuffer = Buffer.from(arrayBuffer);
                }
            } catch (e) { /* ignore conversion attempt */ }
            // Fallback attempt: some versions export a convert function
            if (!docxBuffer) {
                try {
                    const converted = htmlDocx.default ? htmlDocx.default(html) : htmlDocx(html);
                    if (converted instanceof ArrayBuffer) docxBuffer = Buffer.from(converted);
                    else if (typeof converted === 'string') docxBuffer = Buffer.from(converted);
                } catch (e) { /* ignore */ }
            }
            if (docxBuffer) {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename="report-${id}.docx"`);
                return res.send(docxBuffer);
            }
        } catch (e) {
            console.warn('html-docx-js not available:', e && e.message ? e.message : e);
        }
        // As a graceful fallback return HTML with a .doc extension so Word can open it
        res.setHeader('Content-Type', 'application/msword');
        res.setHeader('Content-Disposition', `attachment; filename="report-${id}.doc"`);
        return res.send(html);
    } catch (e) {
        console.error('Failed to generate DOCX', e);
        res.status(500).json({ error: 'Failed to generate DOCX' });
    }
});

// Generate XLSX for a report: include Answers sheet and each uploaded table as separate sheets
app.get('/api/reports/:id/xlsx', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        const rres = await pool.query(`SELECT * FROM ${tables.ACTIVITY_REPORTS} WHERE id = $1`, [id]);
        if (rres.rowCount === 0) return res.status(404).json({ error: 'Report not found' });
        const report = rres.rows[0];
        const [aRes, qRes, dRes] = await Promise.all([
            pool.query(`SELECT * FROM ${tables.ANSWERS} WHERE report_id = $1 ORDER BY id ASC`, [id]),
            pool.query(`SELECT * FROM ${tables.QUESTIONS} WHERE activity_id = $1`, [report.activity_id]),
            pool.query(`SELECT * FROM ${tables.UPLOADED_DOCS} WHERE report_id = $1`, [id])
        ]);
        const answers = aRes.rows || [];
        const questions = qRes.rows || [];
        const uploadedDocs = dRes.rows || [];

        const workbook = new ExcelJS.Workbook();
        const ansSheet = workbook.addWorksheet('Answers');
        ansSheet.columns = [
            { header: 'Question ID', key: 'question_id' },
            { header: 'Question Text', key: 'question_text' },
            { header: 'Answer', key: 'answer' },
            { header: 'Reviewer Comment', key: 'reviewers_comment' },
            { header: 'Followup', key: 'quality_improvement_followup' },
            { header: 'Score', key: 'score' }
        ];
        const qMap = {};
        for (const q of questions) qMap[String(q.id)] = q;
        for (const a of answers) {
            const q = qMap[String(a.question_id)] || {};
            const text = q.question_text || q.questionText || String(a.question_id);
            const val = (typeof a.answer_value === 'object') ? JSON.stringify(a.answer_value) : String(a.answer_value || '');
            ansSheet.addRow({ question_id: a.question_id, question_text: text, answer: val, reviewers_comment: a.reviewers_comment || '', quality_improvement_followup: a.quality_improvement_followup || '', score: a.score || '' });
        }

        // Add each uploaded doc as its own sheet
        for (const doc of uploadedDocs) {
            const rows = Array.isArray(doc.file_content) ? doc.file_content : [];
            const sheetName = (doc.filename || `uploaded_${doc.id}`).slice(0, 31);
            const sheet = workbook.addWorksheet(sheetName);
            if (rows.length === 0) {
                sheet.addRow(['No data']);
            } else {
                const cols = Object.keys(rows[0] || {});
                sheet.columns = cols.map(c => ({ header: c, key: c }));
                for (const r of rows) sheet.addRow(r);
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="report-${id}.xlsx"`);
        return res.send(Buffer.from(buffer));
    } catch (e) {
        console.error('Failed to generate XLSX', e);
        res.status(500).json({ error: 'Failed to generate XLSX' });
    }
});

// Generate an image representation (PNG) of the applied template via puppeteer screenshot
app.get('/api/reports/:id/image', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        const rres = await pool.query(`SELECT * FROM ${tables.ACTIVITY_REPORTS} WHERE id = $1`, [id]);
        if (rres.rowCount === 0) return res.status(404).json({ error: 'Report not found' });
        const report = rres.rows[0];
        // reuse the PDF HTML assembly by calling the existing route; request HTML
        const fetch = globalThis.fetch || require('node-fetch');
        const base = `${req.protocol}://${req.get('host')}`;
        const url = `${base}/api/reports/${id}/pdf?template=${req.query.template ? '1' : '0'}`;
        const r = await fetch(url, { headers: { Accept: 'text/html' } });
        const html = await r.text();
        try {
            const puppeteer = await import('puppeteer');
            const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
            await browser.close();
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', `attachment; filename="report-${id}.png"`);
            return res.send(screenshot);
        } catch (e) {
            console.warn('puppeteer not available for image export:', e && e.message ? e.message : e);
            return res.status(501).json({ error: 'Image export requires puppeteer on the server' });
        }
    } catch (e) { console.error('Failed to generate image', e); res.status(500).json({ error: 'Failed to generate image' }); }
});

// Update a report (reviewers_report, overall_score, status)
app.put('/api/reports/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const reportId = Number(req.params.id);
        if (!reportId) return res.status(400).send('Invalid report id');
        const payload = req.body || {};

        await client.query('BEGIN');

        // Ensure report exists
        const existing = await client.query(`SELECT * FROM ${tables.ACTIVITY_REPORTS} WHERE id = $1`, [reportId]);
        if (existing.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send('Report not found');
        }

        // Build update for top-level report fields. Accept both camelCase and snake_case keys from client.
        const mapKeys = {
            status: 'status',
            reviewersReport: 'reviewers_report',
            reviewers_report: 'reviewers_report',
            overallScore: 'overall_score',
            overall_score: 'overall_score',
            activityId: 'activity_id',
            activity_id: 'activity_id',
            userId: 'user_id',
            user_id: 'user_id',
            facilityId: 'facility_id',
            facility_id: 'facility_id',
            answers: 'answers',
            reportedBy: 'reported_by',
            reported_by: 'reported_by',
            reportTemplateId: 'report_template_id',
            report_template_id: 'report_template_id'
        };
        // Support report-level location and visibility (client may send camelCase or snake_case)
        mapKeys.location = 'location';
        mapKeys.showOnMap = 'show_on_map';
        mapKeys.show_on_map = 'show_on_map';
        const setParts = [];
        const params = [];
        let idx = 1;
        for (const [clientKey, dbKey] of Object.entries(mapKeys)) {
            if (Object.prototype.hasOwnProperty.call(payload, clientKey)) {
                setParts.push(`${dbKey} = $${idx++}`);
                if (dbKey === 'answers') params.push(JSON.stringify(payload[clientKey])); else params.push(payload[clientKey]);
            }
        }

        if (setParts.length > 0) {
            params.push(reportId);
            const sql = `UPDATE ${tables.ACTIVITY_REPORTS} SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`;
            const updated = await client.query(sql, params);
            if (updated.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(500).send('Failed to update report');
            }
        }
        
        // Replace answers if provided (update via helper)
        if (Object.prototype.hasOwnProperty.call(payload, 'answers')) {
            try {
                await upsertReportAnswers(client, reportId, payload, existing.rows[0], req);
            } catch (e) {
                console.error('Failed to update/replace answers during report update', e);
                await client.query('ROLLBACK');
                return res.status(500).send('Failed to update answers');
            }
        }

        // Legacy answers block disabled; kept for reference
        if (false) {

        // Replace answers if provided (delete existing and re-insert)
        if (Object.prototype.hasOwnProperty.call(payload, 'answers')) {
            try {
                await client.query(`DELETE FROM ${tables.ANSWERS} WHERE report_id = $1`, [reportId]);
                const answers = payload.answers || {};
                if (answers && typeof answers === 'object') {
                    for (const [qId, val] of Object.entries(answers)) {
                        try {
                            // If value is an array, treat as a repeatable group: each element is a row object
                            if (Array.isArray(val)) {
                                for (let ri = 0; ri < val.length; ri++) {
                                    const row = val[ri] || {};
                                    if (!row || typeof row !== 'object') continue;
                                    for (const [subQId, subVal] of Object.entries(row)) {
                                        try {
                                            let answerVal = subVal;
                                            let reviewersComment = null; let qiFollowup = null; let score = null;
                                            if (subVal && typeof subVal === 'object' && !(subVal instanceof Array)) {
                                                if (Object.prototype.hasOwnProperty.call(subVal, 'value')) answerVal = subVal.value;
                                                reviewersComment = subVal.reviewersComment || subVal.reviewers_comment || null;
                                                qiFollowup = subVal.qualityImprovementFollowup || subVal.quality_improvement_followup || null;
                                                score = (typeof subVal.score !== 'undefined') ? subVal.score : null;
                                            }
                                            const answerGroup = `${reportId}__${String(qId).replace(/\s+/g, '_')}_${ri}`;
                                            const storedAnswerValue = (answerVal === null || typeof answerVal === 'undefined') ? null : (typeof answerVal === 'object' ? (Object.prototype.hasOwnProperty.call(answerVal, 'value') ? String(answerVal.value) : JSON.stringify(answerVal)) : String(answerVal));
                                            await client.query(`INSERT INTO ${tables.ANSWERS} (report_id, activity_id, question_id, answer_value, answer_row_index, question_group, answer_group, facility_id, user_id, recorded_by, answer_datetime, reviewers_comment, quality_improvement_followup, score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [reportId, payload.activityId || payload.activity_id || existing.rows[0].activity_id, subQId, storedAnswerValue, ri, qId, answerGroup, payload.facilityId || payload.facility_id || existing.rows[0].facility_id || null, payload.userId || payload.user_id || existing.rows[0].user_id || null, req.session && req.session.userId ? req.session.userId : null, new Date(), reviewersComment, qiFollowup, score]);
                                        } catch (ie) { console.error('Failed to insert repeated answer during report update for question', subQId, ie); }
                                    }
                                }
                            } else {
                                let answerVal = val;
                                let reviewersComment = null; let qiFollowup = null; let score = null;
                                if (val && typeof val === 'object' && !(val instanceof Array)) {
                                    if (Object.prototype.hasOwnProperty.call(val, 'value')) answerVal = val.value;
                                    reviewersComment = val.reviewersComment || val.reviewers_comment || null;
                                    qiFollowup = val.qualityImprovementFollowup || val.quality_improvement_followup || null;
                                    score = (typeof val.score !== 'undefined') ? val.score : null;
                                }
                                // non-repeated answers: store null group values
                                const storedAnswerValue = (answerVal === null || typeof answerVal === 'undefined') ? null : (typeof answerVal === 'object' ? (Object.prototype.hasOwnProperty.call(answerVal, 'value') ? String(answerVal.value) : JSON.stringify(answerVal)) : String(answerVal));
                                await client.query(`INSERT INTO ${tables.ANSWERS} (report_id, activity_id, question_id, answer_value, answer_row_index, question_group, answer_group, facility_id, user_id, recorded_by, answer_datetime, reviewers_comment, quality_improvement_followup, score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [reportId, payload.activityId || payload.activity_id || existing.rows[0].activity_id, qId, storedAnswerValue, null, null, null, payload.facilityId || payload.facility_id || existing.rows[0].facility_id || null, payload.userId || payload.user_id || existing.rows[0].user_id || null, req.session && req.session.userId ? req.session.userId : null, new Date(), reviewersComment, qiFollowup, score]);
                            }
                        } catch (ie) { console.error('Failed to insert answer during report update for question', qId, ie); }
                    }
                }
            } catch (e) {
                console.error('Failed to replace answers during report update', e);
                await client.query('ROLLBACK');
                return res.status(500).send('Failed to update answers');
            }
        }

        }

        // Replace uploaded files if provided
        if (Object.prototype.hasOwnProperty.call(payload, 'uploadedFiles')) {
            try {
                // Delete existing uploaded_docs rows for this report (if column exists)
                try {
                    const colRes = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='${tables.UPLOADED_DOCS}' AND column_name='report_id'");
                    if (colRes.rowCount > 0) {
                        await client.query(`DELETE FROM ${tables.UPLOADED_DOCS} WHERE report_id = $1`, [reportId]);
                    } else {
                        // fallback to JSONB field
                        try { await client.query("DELETE FROM ${tables.UPLOADED_DOCS} WHERE (file_content->>'reportId') = $1", [String(reportId)]); } catch (e) { console.warn('Could not delete uploaded_docs by JSON field, skipping:', e.message || e); }
                    }
                } catch (e) { console.warn('uploaded_docs schema check failed during report update delete step', e); }

                const files = payload.uploadedFiles || [];
                if (Array.isArray(files) && files.length > 0) {
                    for (const file of files) {
                        try {
                            const filename = file.name || file.filename || file.fileName || null;
                            const content = file.content || file.data || file;
                            await client.query(`INSERT INTO ${tables.UPLOADED_DOCS} (activity_id, facility_id, user_id, uploaded_by, report_id, file_content, filename) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [payload.activityId || payload.activity_id || existing.rows[0].activity_id, payload.facilityId || payload.facility_id || existing.rows[0].facility_id || null, payload.userId || payload.user_id || existing.rows[0].user_id || null, req.session && req.session.userId ? req.session.userId : null, reportId, JSON.stringify(content), filename]);
                        } catch (ie) { console.error('Failed to insert uploaded file during report update', ie); }
                    }
                }
            } catch (e) {
                console.error('Failed to replace uploaded files during report update', e);
                await client.query('ROLLBACK');
                return res.status(500).send('Failed to update uploaded files');
            }
        }

        // If the payload included a facility location update, persist it to the facility row as well
        try {
            const facilityToUpdate = payload.facilityId || payload.facility_id || (existing.rows[0] ? existing.rows[0].facility_id : null);
            if (facilityToUpdate && (Object.prototype.hasOwnProperty.call(payload, 'location') || Object.prototype.hasOwnProperty.call(payload, 'show_on_map') || Object.prototype.hasOwnProperty.call(payload, 'showOnMap'))) {
                const loc = (Object.prototype.hasOwnProperty.call(payload, 'location')) ? payload.location : null;
                const showFlag = Object.prototype.hasOwnProperty.call(payload, 'show_on_map') ? payload.show_on_map : (Object.prototype.hasOwnProperty.call(payload, 'showOnMap') ? payload.showOnMap : null);
                try {
                    await client.query(`UPDATE ${tables.FACILITIES} SET location = $1, show_on_map = COALESCE($2, show_on_map) WHERE id = $3`, [loc || null, showFlag === null ? null : showFlag, facilityToUpdate]);
                } catch (e) {
                    console.warn('Failed to update facility location/show_on_map during report update', e && e.message ? e.message : e);
                }
            }
        } catch (e) { console.warn('facility update check failed', e); }

        await client.query('COMMIT');
        // Return updated report
        const final = await pool.query(`SELECT * FROM ${tables.ACTIVITY_REPORTS} WHERE id = $1`, [reportId]);
        const r = final.rows[0];
        res.json({
            ...r,
            activityId: r.activity_id,
            userId: r.user_id,
            facilityId: r.facility_id,
            submissionDate: r.submission_date,
            reviewersReport: r.reviewers_report,
            overallScore: r.overall_score,
            reportedBy: r.reported_by
        });
    } catch (e) {
        try { await client.query('ROLLBACK'); } catch (er) { /* ignore */ }
        console.error('Failed to update report transactionally', e);
        res.status(500).send(String(e.message || e));
    } finally {
        client.release();
    }
});

// Accept base64 media uploads for reviews (images/videos). Body: { reportId, filename, contentBase64, mimeType }
app.post('/api/review_uploads', async (req, res) => {
    try {
        const { reportId, filename, contentBase64, mimeType } = req.body || {};
        if (!reportId || !filename || !contentBase64) return res.status(400).send('Missing parameters');
        const safeReportId = String(reportId).replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const folder = path.join(uploadsRoot, 'reports', String(safeReportId));
        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        const ts = Date.now();
        const ext = path.extname(filename) || '';
        const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const savedName = `${ts}_${baseName}${ext}`;
        const filePath = path.join(folder, savedName);
        // contentBase64 may be a data URL or raw base64
        let base64 = contentBase64;
        const comma = base64.indexOf(',');
        if (comma !== -1) base64 = base64.slice(comma + 1);
        const buf = Buffer.from(base64, 'base64');
        fs.writeFileSync(filePath, buf);
        const publicUrl = `${req.protocol}://${req.get('host')}/uploads/reports/${encodeURIComponent(String(safeReportId))}/${encodeURIComponent(savedName)}`;
        // Persist a record in ${tables.UPLOADED_DOCS} so uploads are discoverable and consistent
        try {
            await pool.query(`INSERT INTO ${tables.UPLOADED_DOCS} (activity_id, facility_id, user_id, uploaded_by, report_id, file_content, filename) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [null, null, null, req.session && req.session.userId ? req.session.userId : null, reportId || null, JSON.stringify({ url: publicUrl, mimeType: mimeType || null }), filename]);
        } catch (e) {
            console.warn('Failed to insert review_uploads metadata into ${tables.UPLOADED_DOCS}', e && e.message ? e.message : e);
        }
        res.json({ url: publicUrl, path: filePath });
    } catch (e) {
        console.error('review_uploads error', e);
        res.status(500).send(e.message);
    }
});

// Accept base64 media uploads for template assets (header/footer/watermark).
// Public endpoint that does not require a reportId. Saves files under /uploads/templates and returns a public URL.
app.post('/api/template_uploads', async (req, res) => {
    try {
        const { filename, contentBase64, mimeType } = req.body || {};
        if (!filename || !contentBase64) return res.status(400).send('Missing parameters');
        const folder = path.join(uploadsRoot, 'templates');
        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        const ts = Date.now();
        const ext = path.extname(filename) || '';
        const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const savedName = `${ts}_${baseName}${ext}`;
        const filePath = path.join(folder, savedName);
        let base64 = contentBase64;
        const comma = base64.indexOf(',');
        if (comma !== -1) base64 = base64.slice(comma + 1);
        const buf = Buffer.from(base64, 'base64');
        fs.writeFileSync(filePath, buf);
        const publicUrl = `${req.protocol}://${req.get('host')}/uploads/templates/${encodeURIComponent(savedName)}`;
        // Persist a record in ${tables.UPLOADED_DOCS} for discoverability
        try {
            await pool.query(`INSERT INTO ${tables.UPLOADED_DOCS} (activity_id, facility_id, user_id, uploaded_by, report_id, file_content, filename) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [null, null, null, req.session && req.session.userId ? req.session.userId : null, null, JSON.stringify({ url: publicUrl, mimeType: mimeType || null }), filename]);
        } catch (e) {
            console.warn('Failed to insert template_uploads metadata into ${tables.UPLOADED_DOCS}', e && e.message ? e.message : e);
        }
        res.json({ url: publicUrl, path: filePath });
    } catch (e) {
        console.error('template_uploads error', e);
        res.status(500).send(e.message);
    }
});

// Accept base64 uploads tied to an activity. Body: { activityId, filename, contentBase64, mimeType }
app.post('/api/activity_uploads', async (req, res) => {
    try {
        const { activityId, filename, contentBase64, mimeType } = req.body || {};
        if (!activityId || !filename || !contentBase64) return res.status(400).send('Missing parameters');
        const safeActivity = String(activityId).replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const folder = path.join(uploadsRoot, 'activity', String(safeActivity));
        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        const ts = Date.now();
        const ext = path.extname(filename) || '';
        const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const savedName = `${ts}_${baseName}${ext}`;
        const filePath = path.join(folder, savedName);
        let base64 = contentBase64;
        const comma = base64.indexOf(',');
        if (comma !== -1) base64 = base64.slice(comma + 1);
        const buf = Buffer.from(base64, 'base64');
        fs.writeFileSync(filePath, buf);
        const publicUrl = `${req.protocol}://${req.get('host')}/uploads/activity/${encodeURIComponent(String(safeActivity))}/${encodeURIComponent(savedName)}`;
        try {
            await pool.query(`INSERT INTO ${tables.UPLOADED_DOCS} (activity_id, facility_id, user_id, uploaded_by, report_id, file_content, filename) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [activityId || null, null, null, req.session && req.session.userId ? req.session.userId : null, null, JSON.stringify({ url: publicUrl, mimeType: mimeType || null }), filename]);
        } catch (e) {
            console.warn('Failed to insert activity_uploads metadata into ${tables.UPLOADED_DOCS}', e && e.message ? e.message : e);
        }
        res.json({ url: publicUrl, path: filePath });
    } catch (e) {
        console.error('activity_uploads error', e);
        res.status(500).send(e.message);
    }
});

// API Connectors: CRUD and trigger ingest
app.get('/api/api_connectors', async (req, res) => {
    try {
        const r = await pool.query(`SELECT * FROM ${tables.API_CONNECTORS} ORDER BY id DESC`);
        res.json(r.rows);
    } catch (e) { console.error(e); res.status(500).send(e.message); }
});

app.post('/api/api_connectors', async (req, res) => {
    try {
        const { id, name, base_url, method, auth_config, expected_format } = req.body || {};
        if (id) {
            const up = await pool.query(`UPDATE ${tables.API_CONNECTORS} SET name=$1, base_url=$2, method=$3, auth_config=$4, expected_format=$5 WHERE id=$6 RETURNING *`, [name, base_url, method || 'GET', auth_config ? JSON.stringify(auth_config) : null, expected_format || null, id]);
            return res.json(up.rows[0]);
        }
        const ins = await pool.query(`INSERT INTO ${tables.API_CONNECTORS} (name, base_url, method, auth_config, expected_format, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [name, base_url, method || 'GET', auth_config ? JSON.stringify(auth_config) : null, expected_format || null, req.session && req.session.userId ? req.session.userId : null]);
        res.json(ins.rows[0]);
    } catch (e) { console.error(e); res.status(500).send(e.message); }
});

app.get('/api/api_connectors/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).send('Invalid id');
        const r = await pool.query(`SELECT * FROM ${tables.API_CONNECTORS} WHERE id = $1`, [id]);
        if (r.rowCount === 0) return res.status(404).send('Not found');
        res.json(r.rows[0]);
    } catch (e) { console.error(e); res.status(500).send(e.message); }
});

app.delete('/api/api_connectors/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).send('Invalid id');
        await pool.query(`DELETE FROM ${tables.API_CONNECTORS} WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (e) { console.error(e); res.status(500).send(e.message); }
});

// Trigger a connector fetch and persist result into api_ingests table
app.post('/api/api_connectors/:id/trigger', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).send('Invalid id');
        const cr = await pool.query(`SELECT * FROM ${tables.API_CONNECTORS} WHERE id = $1`, [id]);
        if (cr.rowCount === 0) return res.status(404).send('Connector not found');
        const conn = cr.rows[0];
        const fetch = globalThis.fetch || require('node-fetch');
        const method = (conn.method || 'GET').toUpperCase();
        const headers = { 'Accept': 'application/json' };
        let body = null;
        try {
            const auth = conn.auth_config ? (typeof conn.auth_config === 'string' ? JSON.parse(conn.auth_config) : conn.auth_config) : null;
            if (auth) {
                if (auth.type === 'bearer' && auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
                if (auth.type === 'basic' && auth.username) headers['Authorization'] = 'Basic ' + Buffer.from(`${auth.username}:${auth.password || ''}`).toString('base64');
            }
        } catch (e) { /* ignore parse errors */ }
        // Allow optional body in POST trigger
        if (method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
            body = JSON.stringify(req.body);
            headers['Content-Type'] = 'application/json';
        }
        const r = await fetch(conn.base_url, { method, headers, body });
        const text = await r.text();
        let parsed = null;
        // Try JSON first
        try { parsed = JSON.parse(text); }
        catch (e) {
            // If it's XML, attempt to parse to a JS object using jsdom
            if (typeof text === 'string' && text.trim().startsWith('<')) {
                try {
                    const jsdom = await import('jsdom');
                    const { JSDOM } = jsdom;
                    const dom = new JSDOM(text, { contentType: 'text/xml' });
                    const xmldoc = dom.window.document;
                    const toJson = (node) => {
                        if (!node) return null;
                        // text node
                        if (node.nodeType === 3) return node.nodeValue;
                        const obj = {};
                        const children = Array.from(node.childNodes || []).filter(n => n.nodeType === 1 || (n.nodeType === 3 && (n.nodeValue || '').trim()));
                        if (children.length === 0) return node.textContent;
                        for (const ch of children) {
                            const name = ch.nodeName;
                            const val = toJson(ch);
                            if (Object.prototype.hasOwnProperty.call(obj, name)) {
                                if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
                                obj[name].push(val);
                            } else obj[name] = val;
                        }
                        // attributes
                        if (node.attributes && node.attributes.length) {
                            for (const a of Array.from(node.attributes || [])) {
                                obj[`@${a.name}`] = a.value;
                            }
                        }
                        return obj;
                    };
                    parsed = toJson(xmldoc);
                } catch (ex) {
                    // fallback to raw text if XML parsing fails
                    console.warn('XML parse failed for connector response', ex && ex.message ? ex.message : ex);
                    parsed = text;
                }
            } else {
                parsed = text;
            }
        }
        const meta = { status: r.status, statusText: r.statusText, url: conn.base_url };
        // Upsert behavior: update latest ingest for this connector if exists, otherwise insert
        try {
            const exist = await pool.query(`SELECT id FROM ${tables.API_INGESTS} WHERE connector_id = $1 ORDER BY received_at DESC LIMIT 1`, [id]);
            if (exist.rowCount > 0) {
                const ingestId = exist.rows[0].id;
                await pool.query(`UPDATE ${tables.API_INGESTS} SET raw_data = $1, metadata = $2, received_at = NOW() WHERE id = $3`, [JSON.stringify(parsed), JSON.stringify(meta), ingestId]);
                return res.json({ ok: true, status: r.status, data: parsed, ingestId });
            } else {
                const ins = await pool.query(`INSERT INTO ${tables.API_INGESTS} (connector_id, raw_data, metadata) VALUES ($1,$2,$3) RETURNING id`, [id, JSON.stringify(parsed), JSON.stringify(meta)]);
                return res.json({ ok: true, status: r.status, data: parsed, ingestId: ins.rows[0].id });
            }
        } catch (e) {
            console.error('Failed to upsert api_ingest', e);
            // fallback to insert to avoid losing data
            await pool.query(`INSERT INTO ${tables.API_INGESTS} (connector_id, raw_data, metadata) VALUES ($1,$2,$3)`, [id, JSON.stringify(parsed), JSON.stringify(meta)]);
            return res.json({ ok: true, status: r.status, data: parsed });
        }
    } catch (e) { console.error(e); res.status(500).send(e.message); }
});

// Delete an ingest by id
app.delete('/api/api_ingests/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).send('Invalid id');
        await pool.query(`DELETE FROM ${tables.API_INGESTS} WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (e) { console.error('Failed to delete ingest', e); res.status(500).send(e.message); }
});

// List ingests (optionally by connectorId)
app.get('/api/api_ingests', async (req, res) => {
    try {
        const { connectorId } = req.query;
        if (connectorId) {
            const r = await pool.query(`SELECT * FROM ${tables.API_INGESTS} WHERE connector_id = $1 ORDER BY received_at DESC`, [connectorId]);
            return res.json(r.rows);
        }
        const r = await pool.query(`SELECT * FROM ${tables.API_INGESTS} ORDER BY received_at DESC`);
        res.json(r.rows);
    } catch (e) { console.error(e); res.status(500).send(e.message); }
});

// Patch an ingest's raw_data (allow editing/saving transformed JSON from frontend)
app.patch('/api/api_ingests/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        const payload = req.body || {};
        if (!Object.prototype.hasOwnProperty.call(payload, 'raw_data')) return res.status(400).json({ error: 'Missing raw_data' });
        let toStore = payload.raw_data;
        // If raw_data is a string that contains JSON, attempt to parse so we store structured JSONB
        if (typeof toStore === 'string') {
            try { toStore = JSON.parse(toStore); } catch (e) { /* keep as string (will be stored as JSON string) */ }
        }
        const r = await pool.query(`UPDATE ${tables.API_INGESTS} SET raw_data = $1, received_at = NOW() WHERE id = $2 RETURNING *`, [toStore, id]);
        if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json(r.rows[0]);
    } catch (e) {
        console.error('Failed to update api_ingest', e);
        res.status(500).json({ error: String(e) });
    }
});

// Delete a report and its associated uploaded docs and media files
app.delete('/api/reports/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        // Safely delete uploaded_docs rows if the DB has a report_id column.
        // Some installations may not have migrated ${tables.UPLOADED_DOCS}.report_id; in that case
        // attempt a best-effort deletion by checking file_content->>'reportId' JSON field.
        try {
            const colRes = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name='${tables.UPLOADED_DOCS}' AND column_name='report_id'");
            if (colRes.rowCount > 0) {
                await pool.query(`DELETE FROM ${tables.UPLOADED_DOCS} WHERE report_id = $1`, [id]);
            } else {
                try {
                    await pool.query("DELETE FROM ${tables.UPLOADED_DOCS} WHERE (file_content->>'reportId') = $1", [String(id)]);
                } catch (e) {
                    console.warn('Could not delete uploaded_docs by JSON field, skipping:', e.message || e);
                }
            }
        } catch (e) {
            console.warn('Skipping uploaded_docs deletion due to error checking schema:', e.message || e);
        }

        // Remove filesystem uploads folder for this report (if any)
        const folder = path.join(uploadsRoot, 'reports', String(id));
        try { if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true }); } catch (e) { console.error('Failed to remove upload folder', e); }

        // delete the report (answers cascade if DB has FK)
        const result = await pool.query(`DELETE FROM ${tables.ACTIVITY_REPORTS} WHERE id = $1 RETURNING *`, [id]);
        if (result.rowCount === 0) return res.status(404).send('Report not found');
        res.json({ ok: true });
    } catch (e) {
        console.error('Failed to delete report', e);
        res.status(500).send(e.message);
    }
});

// Get uploaded_docs by activityId or facilityId or userId
app.get('/api/uploaded_docs', async (req, res) => {
    const { activityId, facilityId, userId } = req.query;
    const reportId = req.query.reportId;
    try {
        const clauses = [];
        const params = [];
        let idx = 1;

        if (reportId) {
            // Some DBs may not have a physical report_id column. Detect and fallback to JSONB file_content->>'reportId'
            try {
                const colRes = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name='${tables.UPLOADED_DOCS}' AND column_name='report_id'");
                if (colRes.rowCount > 0) {
                    clauses.push(`report_id = $${idx++}`);
                    params.push(reportId);
                } else {
                    clauses.push(`(file_content->>'reportId') = $${idx++}`);
                    params.push(String(reportId));
                }
            } catch (err) {
                // If schema check fails, fall back to JSONB approach
                clauses.push(`(file_content->>'reportId') = $${idx++}`);
                params.push(String(reportId));
            }
        }
        if (activityId) { clauses.push(`activity_id = $${idx++}`); params.push(activityId); }
        if (facilityId) { clauses.push(`facility_id = $${idx++}`); params.push(facilityId); }
        if (userId) { clauses.push(`user_id = $${idx++}`); params.push(userId); }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `SELECT * FROM ${tables.UPLOADED_DOCS} ${where} ORDER BY created_at DESC`;
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (e) { res.status(500).send(e.message); }
});

// Questions endpoint: get questions by activity
app.get('/api/questions', async (req, res) => {
    const { activityId } = req.query;
    try {
        if (!activityId) return res.status(400).send('Missing activityId');
        const result = await pool.query(`SELECT * FROM ${tables.QUESTIONS} WHERE activity_id = $1 ORDER BY created_at ASC`, [activityId]);
        res.json(result.rows.map(q => ({
            id: q.id,
            activityId: q.activity_id,
            pageName: q.page_name,
            sectionName: q.section_name,
            questionText: q.question_text,
            questionHelper: q.question_helper,
            correctAnswer: q.correct_answer,
            answerType: q.answer_type,
            category: q.category,
            questionGroup: q.question_group,
            columnSize: q.column_size,
            status: q.status,
            options: q.options,
            metadata: q.metadata,
            createdBy: q.created_by
        })));
    } catch (e) { res.status(500).send(e.message); }
});

// Answer Groups endpoint: get unique answer_group values for an activity
app.get('/api/answer_groups', async (req, res) => {
    const { activityId } = req.query;
    try {
        if (!activityId) return res.status(400).send('Missing activityId');
        const result = await pool.query(
            `SELECT DISTINCT answer_group FROM ${tables.ANSWERS} WHERE activity_id = $1 AND answer_group IS NOT NULL AND answer_group != '' ORDER BY answer_group ASC`,
            [activityId]
        );
        const groups = result.rows.map(r => r.answer_group);
        res.json(groups);
    } catch (e) { res.status(500).send(e.message); }
});

// Answers endpoint: query by activityId, reportId, facilityId
app.get('/api/answers', async (req, res) => {
    const { activityId, reportId, facilityId } = req.query;
    try {
        const clauses = [];
        const params = [];
        let idx = 1;
        if (reportId) { clauses.push(`report_id = $${idx++}`); params.push(reportId); }
        if (activityId) { clauses.push(`activity_id = $${idx++}`); params.push(activityId); }
        if (facilityId) { clauses.push(`facility_id = $${idx++}`); params.push(facilityId); }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `SELECT * FROM ${tables.ANSWERS} ${where} ORDER BY created_at DESC`;
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (e) { res.status(500).send(e.message); }
});

// Activity dashboard aggregation endpoint
app.get('/api/activity_dashboard/:activityId', async (req, res) => {
    const { activityId } = req.params;
    try {
        const activityRes = await pool.query(`SELECT * FROM ${tables.ACTIVITIES} WHERE id = $1`, [activityId]);
        if (activityRes.rowCount === 0) return res.status(404).send('Activity not found');
        const activity = activityRes.rows[0];

        const questionsRes = await pool.query(`SELECT * FROM ${tables.QUESTIONS} WHERE activity_id = $1 ORDER BY created_at ASC`, [activityId]);
        const questions = questionsRes.rows;

        const reportsRes = await pool.query(`SELECT * FROM ${tables.ACTIVITY_REPORTS} WHERE activity_id = $1 ORDER BY submission_date DESC`, [activityId]);
        const reports = reportsRes.rows;

        const answersRes = await pool.query(`SELECT * FROM ${tables.ANSWERS} WHERE activity_id = $1 ORDER BY created_at DESC`, [activityId]);
        const answers = answersRes.rows;

        const docsRes = await pool.query(`SELECT * FROM ${tables.UPLOADED_DOCS} WHERE activity_id = $1 ORDER BY created_at DESC`, [activityId]);
        const uploadedDocs = docsRes.rows;

        // Simple aggregation: counts per question id
        const answersByQuestion = {};
        for (const a of answers) {
            const q = a.question_id || 'unknown';
            answersByQuestion[q] = answersByQuestion[q] || [];
            answersByQuestion[q].push(a);
        }

        res.json({ activity, questions, reports, answers, answersByQuestion, uploadedDocs });
    } catch (e) {
        console.error('activity_dashboard error', e);
        res.status(500).send(e.message);
    }
});

// Update question follow-up (quality_improvement_followup) and other fields
app.put('/api/questions/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};
    const allowed = ['status', 'correct_answer', 'correctAnswer'];
    const setParts = [];
    const params = [];
    let idx = 1;
    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            setParts.push(`${key} = $${idx++}`);
            params.push(updates[key]);
        }
    }
    if (setParts.length === 0) return res.status(400).send('No updatable fields provided');
    params.push(id);
    const sql = `UPDATE ${tables.QUESTIONS} SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`;
    try {
        const result = await pool.query(sql, params);
        res.json(result.rows[0]);
    } catch (e) {
        console.error('Failed to update question', e);
        res.status(500).send(e.message);
    }
});

// Update an answer's reviewer fields (reviewers_comment, quality_improvement_followup, score)
app.put('/api/answers/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};
    const allowed = ['reviewers_comment', 'quality_improvement_followup', 'score', 'status'];
    const setParts = [];
    const params = [];
    let idx = 1;
    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            setParts.push(`${key} = $${idx++}`);
            params.push(updates[key]);
        }
    }
    if (setParts.length === 0) return res.status(400).send('No updatable fields provided');
    params.push(id);
    const sql = `UPDATE ${tables.ANSWERS} SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`;
    try {
        const result = await pool.query(sql, params);
        res.json(result.rows[0]);
    } catch (e) {
        console.error('Failed to update answer', e);
        res.status(500).send(e.message);
    }
});

// Update a single cell in an uploaded_docs file_content JSONB (rowIndex, colKey, newValue)
app.put('/api/uploaded_docs/:id', async (req, res) => {
    const { id } = req.params;
    const { rowIndex, colKey, newValue } = req.body;
    try {
        const docRes = await pool.query(`SELECT * FROM ${tables.UPLOADED_DOCS} WHERE id = $1`, [id]);
        if (docRes.rowCount === 0) return res.status(404).json({ error: 'uploaded_doc not found' });
        const doc = docRes.rows[0];
        const content = doc.file_content || [];
        if (!Array.isArray(content)) return res.status(400).json({ error: 'file_content must be an array of rows' });
        if (typeof rowIndex !== 'number' || rowIndex < 0 || rowIndex >= content.length) return res.status(400).json({ error: 'rowIndex out of range' });
        const row = content[rowIndex] || {};
        row[colKey] = newValue;
        content[rowIndex] = row;
        await pool.query(`UPDATE ${tables.UPLOADED_DOCS} SET file_content = $1 WHERE id = $2`, [JSON.stringify(content), id]);
        res.json({ success: true, file_content: content });
    } catch (err) {
        console.error('Failed to update uploaded_doc', err);
        res.status(500).json({ error: 'Failed to update uploaded_doc' });
    }
});

// Delete an uploaded doc by id
app.delete('/api/uploaded_docs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const docRes = await pool.query(`SELECT * FROM ${tables.UPLOADED_DOCS} WHERE id = $1`, [id]);
        if (docRes.rowCount === 0) return res.status(404).json({ error: 'uploaded_doc not found' });
        await pool.query(`DELETE FROM ${tables.UPLOADED_DOCS} WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (e) {
        console.error('Failed to delete uploaded_doc', e);
        res.status(500).json({ error: 'Failed to delete uploaded_doc' });
    }
});

app.post('/api/reports', async (req, res) => {
    const { activityId, userId, facilityId, status, answers, uploadedFiles, id: maybeId, reportId: maybeReportId } = req.body;
    try {
        // Determine current user's role for permission checks (default to 'public')
        let currentRole = 'public';
        try {
            if (req.session && req.session.userId) {
                const ur = await pool.query(`SELECT role FROM ${tables.USERS} WHERE id = $1 LIMIT 1`, [req.session.userId]);
                if (ur.rows && ur.rows.length) currentRole = ur.rows[0].role || currentRole;
            }
        } catch (e) { console.error('Failed to determine current user role for reports endpoint', e); }

        // Collect question ids referenced in the provided answers object
        const collectQuestionIds = (ans) => {
            const set = new Set();
            if (!ans || typeof ans !== 'object') return set;
            for (const [qId, val] of Object.entries(ans)) {
                if (Array.isArray(val)) {
                    for (const row of val || []) {
                        if (row && typeof row === 'object') {
                            for (const sub of Object.keys(row)) set.add(String(sub));
                        }
                    }
                } else if (val && typeof val === 'object' && !(val instanceof Array)) {
                    // single answer object (may include reviewersComment etc)
                    set.add(String(qId));
                } else {
                    set.add(String(qId));
                }
            }
            return set;
        };

        const qIdSet = collectQuestionIds(answers || {});

        // Permission check: if any question maps to a page/section the role lacks create/edit, block
        if (qIdSet.size > 0) {
            const qIds = Array.from(qIdSet);
            try {
                const qres = await pool.query(`SELECT id, page_name, section_name FROM ${tables.QUESTIONS} WHERE id = ANY($1::text[])`, [qIds]);
                const missing = [];
                // Determine whether this POST is an update (edit) or a create (new)
                const incomingReportId = (maybeId || maybeReportId) ? Number(maybeId || maybeReportId) : null;
                for (const q of qres.rows || []) {
                    const pageKey = q.page_name || '';
                    const sectionKey = (q.section_name === null || typeof q.section_name === 'undefined') ? null : q.section_name;
                    const permRes = await pool.query(`SELECT can_create, can_edit FROM ${tables.PAGE_PERMISSIONS} WHERE page_key = $1 AND ((section_key IS NULL AND $2 IS NULL) OR section_key = $2) AND role_name = $3 LIMIT 1`, [pageKey, sectionKey, currentRole]);
                    const perm = permRes.rows && permRes.rows[0] ? permRes.rows[0] : null;
                    if (incomingReportId) {
                        if (!perm || !perm.can_edit) missing.push({ page: pageKey, section: sectionKey, qid: q.id, need: 'edit' });
                    } else {
                        if (!perm || !perm.can_create) missing.push({ page: pageKey, section: sectionKey, qid: q.id, need: 'create' });
                    }
                }
                if (missing.length) return res.status(403).json({ error: 'Permission denied for action on some pages/sections', details: missing });
            } catch (e) { console.error('Failed during report permission checks', e); /* fall through to normal behavior on error */ }
        }
        // If client includes an id or reportId in the POST payload, perform an update instead of creating a duplicate
        const incomingReportId = (maybeId || maybeReportId) ? Number(maybeId || maybeReportId) : null;
        if (incomingReportId) {
            // Delegate to the existing update logic to replace answers/uploaded files transactionally
            const client = await pool.connect();
            try {
                const reportId = incomingReportId;
                await client.query('BEGIN');
                const existing = await client.query(`SELECT * FROM ${tables.ACTIVITY_REPORTS} WHERE id = $1`, [reportId]);
                if (existing.rowCount === 0) { await client.query('ROLLBACK'); client.release(); return res.status(404).send('Report not found'); }

                // update top-level fields if provided
                const payload = req.body || {};
                const mapKeys = {
                    status: 'status',
                    reviewersReport: 'reviewers_report',
                    reviewers_report: 'reviewers_report',
                    overallScore: 'overall_score',
                    overall_score: 'overall_score',
                    activityId: 'activity_id',
                    activity_id: 'activity_id',
                    userId: 'user_id',
                    user_id: 'user_id',
                    facilityId: 'facility_id',
                    facility_id: 'facility_id',
                    answers: 'answers',
                    reportedBy: 'reported_by',
                    reported_by: 'reported_by',
                    reportTemplateId: 'report_template_id',
                    report_template_id: 'report_template_id'
                };
                const setParts = [];
                const params = [];
                let idx = 1;
                for (const [clientKey, dbKey] of Object.entries(mapKeys)) {
                    if (Object.prototype.hasOwnProperty.call(payload, clientKey)) {
                        setParts.push(`${dbKey} = $${idx++}`);
                        if (dbKey === 'answers') params.push(JSON.stringify(payload[clientKey])); else params.push(payload[clientKey]);
                    }
                }
                if (setParts.length > 0) {
                    params.push(reportId);
                    const sql = `UPDATE ${tables.ACTIVITY_REPORTS} SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`;
                    const updated = await client.query(sql, params);
                    if (updated.rowCount === 0) { await client.query('ROLLBACK'); client.release(); return res.status(500).send('Failed to update report'); }
                }

                // replace answers if provided
                if (Object.prototype.hasOwnProperty.call(payload, 'answers')) {
                    await client.query(`DELETE FROM ${tables.ANSWERS} WHERE report_id = $1`, [reportId]);
                    const answersObj = payload.answers || {};
                    if (answersObj && typeof answersObj === 'object') {
                        for (const [qId, val] of Object.entries(answersObj)) {
                            try {
                                // If value is an array, treat as a repeatable group: each element is a row object
                                if (Array.isArray(val)) {
                                    for (let ri = 0; ri < val.length; ri++) {
                                        const row = val[ri] || {};
                                        if (!row || typeof row !== 'object') continue;
                                        for (const [subQId, subVal] of Object.entries(row)) {
                                            try {
                                                let answerVal = subVal;
                                                let reviewersComment = null; let qiFollowup = null; let score = null;
                                                if (subVal && typeof subVal === 'object' && !(subVal instanceof Array)) {
                                                    if (Object.prototype.hasOwnProperty.call(subVal, 'value')) answerVal = subVal.value;
                                                    reviewersComment = subVal.reviewersComment || subVal.reviewers_comment || null;
                                                    qiFollowup = subVal.qualityImprovementFollowup || subVal.quality_improvement_followup || null;
                                                    score = (typeof subVal.score !== 'undefined') ? subVal.score : null;
                                                }
                                                // store only the primitive value in answer_value (TEXT), keep grouping metadata in separate columns
                                                const answerGroup = `${reportId}__${String(qId).replace(/\s+/g, '_')}_${ri}`;
                                                const storedAnswerValue = (answerVal === null || typeof answerVal === 'undefined') ? null : (typeof answerVal === 'object' ? (Object.prototype.hasOwnProperty.call(answerVal, 'value') ? String(answerVal.value) : JSON.stringify(answerVal)) : String(answerVal));
                                                await client.query(`INSERT INTO ${tables.ANSWERS} (report_id, activity_id, question_id, answer_value, answer_row_index, question_group, answer_group, facility_id, user_id, recorded_by, answer_datetime, reviewers_comment, quality_improvement_followup, score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [reportId, payload.activityId || payload.activity_id || existing.rows[0].activity_id, subQId, storedAnswerValue, ri, qId, answerGroup, payload.facilityId || payload.facility_id || existing.rows[0].facility_id || null, payload.userId || payload.user_id || existing.rows[0].user_id || null, req.session && req.session.userId ? req.session.userId : null, new Date(), reviewersComment, qiFollowup, score]);
                                            } catch (ie) { console.error('Failed to insert repeated answer during report POST-as-update for question', subQId, ie); }
                                        }
                                    }
                                } else {
                                    let answerVal = val; let reviewersComment = null; let qiFollowup = null; let score = null;
                                    if (val && typeof val === 'object' && !(val instanceof Array)) {
                                        if (Object.prototype.hasOwnProperty.call(val, 'value')) answerVal = val.value;
                                        reviewersComment = val.reviewersComment || val.reviewers_comment || null;
                                        qiFollowup = val.qualityImprovementFollowup || val.quality_improvement_followup || null;
                                        score = (typeof val.score !== 'undefined') ? val.score : null;
                                    }
                                    const storedAnswerValue = (answerVal === null || typeof answerVal === 'undefined') ? null : (typeof answerVal === 'object' ? (Object.prototype.hasOwnProperty.call(answerVal, 'value') ? String(answerVal.value) : JSON.stringify(answerVal)) : String(answerVal));
                                    await client.query(`INSERT INTO ${tables.ANSWERS} (report_id, activity_id, question_id, answer_value, answer_row_index, question_group, answer_group, facility_id, user_id, recorded_by, answer_datetime, reviewers_comment, quality_improvement_followup, score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [reportId, payload.activityId || payload.activity_id || existing.rows[0].activity_id, qId, storedAnswerValue, null, null, null, payload.facilityId || payload.facility_id || existing.rows[0].facility_id || null, payload.userId || payload.user_id || existing.rows[0].user_id || null, req.session && req.session.userId ? req.session.userId : null, new Date(), reviewersComment, qiFollowup, score]);
                                }
                            } catch (ie) { console.error('Failed to insert answer during report POST-as-update for question', qId, ie); }
                        }
                    }
                }

                // replace uploaded files if provided
                if (Object.prototype.hasOwnProperty.call(payload, 'uploadedFiles')) {
                    try {
                        try {
                            const colRes = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='${tables.UPLOADED_DOCS}' AND column_name='report_id'");
                            if (colRes.rowCount > 0) { await client.query(`DELETE FROM ${tables.UPLOADED_DOCS} WHERE report_id = $1`, [reportId]); }
                            else { try { await client.query("DELETE FROM ${tables.UPLOADED_DOCS} WHERE (file_content->>'reportId') = $1", [String(reportId)]); } catch (e) { console.warn('Could not delete uploaded_docs by JSON field, skipping:', e.message || e); } }
                        } catch (e) { console.warn('uploaded_docs schema check failed during report update delete step', e); }
                        const files = payload.uploadedFiles || [];
                        if (Array.isArray(files) && files.length > 0) {
                            for (const file of files) {
                                try { const filename = file.name || file.filename || file.fileName || null; const content = file.content || file.data || file; await client.query(`INSERT INTO ${tables.UPLOADED_DOCS} (activity_id, facility_id, user_id, uploaded_by, report_id, file_content, filename) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [payload.activityId || payload.activity_id || existing.rows[0].activity_id, payload.facilityId || payload.facility_id || existing.rows[0].facility_id || null, payload.userId || payload.user_id || existing.rows[0].user_id || null, req.session && req.session.userId ? req.session.userId : null, reportId, JSON.stringify(content), filename]); } catch (ie) { console.error('Failed to insert uploaded file during report POST-as-update', ie); }
                            }
                        }
                    } catch (e) { console.error('Failed to replace uploaded files during report POST-as-update', e); await client.query('ROLLBACK'); client.release(); return res.status(500).send('Failed to update uploaded files'); }
                }

                await client.query('COMMIT');
                const final = await pool.query(`SELECT * FROM ${tables.ACTIVITY_REPORTS} WHERE id = $1`, [reportId]);
                const r = final.rows[0];
                client.release();
                return res.json({ ...r, activityId: r.activity_id, userId: r.user_id, facilityId: r.facility_id, submissionDate: r.submission_date, reviewersReport: r.reviewers_report, overallScore: r.overall_score, reportedBy: r.reported_by });
            } catch (e) {
                try { await client.query('ROLLBACK'); } catch (er) { /* ignore */ }
                client.release();
                console.error('Failed to perform POST-as-update', e);
                return res.status(500).send('Failed to update report');
            }
        }
        // Validate entity linking per activity response type
        try {
            const actRes = await pool.query(`SELECT response_type FROM ${tables.ACTIVITIES} WHERE id = $1`, [activityId]);
            if (actRes.rowCount === 0) return res.status(400).send('Invalid activityId');
            const respType = (actRes.rows[0].response_type || '').toString().toLowerCase();
            if (respType === 'facility' && !facilityId) return res.status(400).send('facilityId is required for this activity');
            if (respType === 'user' && !userId) return res.status(400).send('userId is required for this activity');
        } catch (err) {
            console.error('Failed to validate activity response type', err);
        }
        // Insert report row (default status to 'Pending' if not provided)
        const finalStatus = status || 'Pending';
        // Determine business id for report (use session business by default)
        let reportBusinessId = null;
        if (req.session && req.session.userId) reportBusinessId = req.session.businessId || null;
        const result = await pool.query(
            `INSERT INTO ${tables.ACTIVITY_REPORTS} (activity_id, user_id, facility_id, status, answers, business_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [activityId, userId, facilityId, finalStatus, answers || null, reportBusinessId]
        );
        const report = result.rows[0];

        // Persist uploaded files into uploaded_docs table (one row per file)
        try {
            if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
                for (const file of uploadedFiles) {
                    try {
                        const filename = file.name || file.filename || file.fileName || null;
                        const content = file.content || file.data || file; // expect JSON-able representation
                        await pool.query(`INSERT INTO ${tables.UPLOADED_DOCS} (activity_id, facility_id, user_id, uploaded_by, report_id, file_content, filename, business_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [activityId, facilityId, userId || null, req.session.userId || null, report.id, JSON.stringify(content), filename, reportBusinessId]);
                    } catch (e) {
                        console.error('Failed to persist uploaded file', e);
                    }
                }
            }
        } catch (e) {
            console.error('Error persisting uploaded files:', e);
        }

        // Persist individual answers to the answers table for querying
        try {
            if (answers && typeof answers === 'object') {
                for (const [qId, val] of Object.entries(answers)) {
                    try {
                        // If this value is an array, treat it as a repeatable section: each array element is a row object
                        if (Array.isArray(val)) {
                            for (let ri = 0; ri < val.length; ri++) {
                                const row = val[ri] || {};
                                if (!row || typeof row !== 'object') continue;
                                for (const [subQId, subVal] of Object.entries(row)) {
                                    try {
                                        let answerVal = subVal;
                                        let reviewersComment = null; let qiFollowup = null; let score = null;
                                        if (subVal && typeof subVal === 'object' && !(subVal instanceof Array)) {
                                            if (Object.prototype.hasOwnProperty.call(subVal, 'value')) answerVal = subVal.value;
                                            reviewersComment = subVal.reviewersComment || subVal.reviewers_comment || null;
                                            qiFollowup = subVal.qualityImprovementFollowup || subVal.quality_improvement_followup || null;
                                            score = (typeof subVal.score !== 'undefined') ? subVal.score : null;
                                        }
                                            const answerGroup = `${report.id}__${String(qId).replace(/\s+/g, '_')}_${ri}`;
                                            const storedAnswerValue = (answerVal === null || typeof answerVal === 'undefined') ? null : (typeof answerVal === 'object' ? (Object.prototype.hasOwnProperty.call(answerVal, 'value') ? String(answerVal.value) : JSON.stringify(answerVal)) : String(answerVal));
                                            await pool.query(`INSERT INTO ${tables.ANSWERS} (report_id, activity_id, question_id, answer_value, answer_row_index, question_group, answer_group, facility_id, user_id, recorded_by, answer_datetime, reviewers_comment, quality_improvement_followup, score, business_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [report.id, activityId, subQId, storedAnswerValue, ri, qId, answerGroup, facilityId || null, userId || null, req.session.userId || null, new Date(), reviewersComment, qiFollowup, score, req.session && req.session.businessId ? req.session.businessId : null]);
                                    } catch (e) { console.error('Failed to insert repeated answer for question', subQId, e); }
                                }
                            }
                        } else {
                            // support val as primitive or object { value, reviewersComment, qualityImprovementFollowup, score }
                            let answerVal = val;
                            let reviewersComment = null;
                            let qiFollowup = null;
                            let score = null;
                            if (val && typeof val === 'object' && !(val instanceof Array)) {
                                if (Object.prototype.hasOwnProperty.call(val, 'value')) answerVal = val.value;
                                reviewersComment = val.reviewersComment || val.reviewers_comment || null;
                                qiFollowup = val.qualityImprovementFollowup || val.quality_improvement_followup || null;
                                score = (typeof val.score !== 'undefined') ? val.score : null;
                            }
                            const storedAnswerValue = (answerVal === null || typeof answerVal === 'undefined') ? null : (typeof answerVal === 'object' ? (Object.prototype.hasOwnProperty.call(answerVal, 'value') ? String(answerVal.value) : JSON.stringify(answerVal)) : String(answerVal));
                            await pool.query(`INSERT INTO ${tables.ANSWERS} (report_id, activity_id, question_id, answer_value, answer_row_index, question_group, answer_group, facility_id, user_id, recorded_by, answer_datetime, reviewers_comment, quality_improvement_followup, score, business_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [report.id, activityId, qId, storedAnswerValue, null, null, null, facilityId || null, userId || null, req.session.userId || null, new Date(), reviewersComment, qiFollowup, score, req.session && req.session.businessId ? req.session.businessId : null]);
                        }
                    } catch (e) {
                        console.error('Failed to insert answer for question', qId, e);
                    }
                }
            }
        } catch (e) {
            console.error('Error persisting answers:', e);
        }

        res.json(report);
    } catch (e) { res.status(500).send(e.message); }
});

// Initialize DB then start server
// Public metadata endpoint (serves demo metadata files from public/metadata)

app.get('/api/public/metadata', (req, res) => {
    try {
        const metaDir = path.join(__dirname, '..', 'public', 'metadata');
        const files = [
            'care_levels.json',
            'ownership_types.json',
            'indicators.json',
            'roles.json',
            'permissions.json',
            'role_permissions.json'
        ];
        const out = {};
        files.forEach(f => {
            const p = path.join(metaDir, f);
            if (fs.existsSync(p)) {
                try {
                    out[path.basename(f, '.json')] = JSON.parse(fs.readFileSync(p, 'utf8'));
                } catch (e) {
                    console.warn('Failed parsing metadata file', p, e.message);
                }
            }
        });
        res.json(out);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

    // Public indicator summary endpoint: aggregates answers by indicator definitions
    app.get('/api/public/indicator_summary', async (req, res) => {
        try {
            const { activityId } = req.query;
            // load indicators metadata from public metadata folder
            const metaDir = path.join(__dirname, '..', 'public', 'metadata');
            const indicatorsPath = path.join(metaDir, 'indicators.json');
            let indicators = [];
            try { if (fs.existsSync(indicatorsPath)) indicators = JSON.parse(fs.readFileSync(indicatorsPath, 'utf8')); } catch (e) { indicators = []; }

            // If activityId provided, determine the set of question_ids for that activity
            let allowedQuestionIds = null;
            if (activityId) {
                try {
                    const qres = await pool.query(`SELECT id FROM ${tables.QUESTIONS} WHERE activity_id = $1`, [activityId]);
                    allowedQuestionIds = qres.rows.map(r => String(r.id));
                } catch (e) { allowedQuestionIds = null; }
            }

            const results = [];
            for (const ind of (indicators || [])) {
                const questionId = ind.questionId || ind.id || ind.dataType;
                // If activity provided and this indicator's questionId is not part of activity, skip
                if (activityId && Array.isArray(allowedQuestionIds) && allowedQuestionIds.length && !allowedQuestionIds.includes(String(questionId))) {
                    continue;
                }

                // build query: match by question_id == questionId
                const params = [questionId];
                let idx = 2;
                let where = `WHERE question_id = $1`;
                if (activityId) { where += ` AND activity_id = $${idx++}`; params.push(activityId); }
                const sql = `SELECT answer_value, facility_id FROM ${tables.ANSWERS} ${where} ORDER BY created_at DESC LIMIT 10000`;
                const ares = await pool.query(sql, params);
                const rows = ares.rows || [];

                const bandCounts = {};
                const sampleValues = [];
                let reported = 0;
                for (const r of rows) {
                    let val = r.answer_value;
                    if (val === null || typeof val === 'undefined') { bandCounts['unknown'] = (bandCounts['unknown'] || 0) + 1; continue; }
                    reported += 1;
                    if (typeof val === 'string') {
                        try { val = JSON.parse(val); } catch (e) { /* keep as string */ }
                    }
                    if (val && typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, 'band')) {
                        const b = String(val.band || 'unknown').toLowerCase();
                        bandCounts[b] = (bandCounts[b] || 0) + 1;
                        sampleValues.push(val);
                    } else if (typeof val === 'number') {
                        const n = Number(val);
                        let b = 'unknown';
                        if (!isNaN(n)) { if (n >= 90) b = 'high'; else if (n >= 70) b = 'medium'; else b = 'low'; }
                        bandCounts[b] = (bandCounts[b] || 0) + 1;
                        sampleValues.push(n);
                    } else {
                        bandCounts['unknown'] = (bandCounts['unknown'] || 0) + 1;
                        sampleValues.push(val);
                    }
                    if (sampleValues.length >= 5) { /* keep small sample */ }
                }
                results.push({ id: ind.id, name: ind.name || ind.id, reported, sampleValues: sampleValues.slice(0, 5), bandCounts });
            }

            res.json({ indicators: results });
        } catch (e) {
            console.error('indicator_summary error', e);
            res.status(500).json({ error: String(e) });
        }
    });

    // Public facility summary endpoint (country-level aggregates)
    app.get('/api/public/facility_summary', async (req, res) => {
        try {
            // total facilities
            const totalRes = await pool.query(`SELECT COUNT(*)::int as cnt FROM ${tables.FACILITIES}`);
            const total = totalRes.rows && totalRes.rows[0] ? Number(totalRes.rows[0].cnt || 0) : 0;

            // contributors: distinct users from activity_reports.reported_by and answers.recorded_by/user_id
            const contribRes = await pool.query(`
                SELECT COUNT(DISTINCT uid) as cnt FROM (
                    SELECT reported_by as uid FROM ${tables.ACTIVITY_REPORTS} WHERE reported_by IS NOT NULL
                    UNION
                    SELECT user_id as uid FROM ${tables.ACTIVITY_REPORTS} WHERE user_id IS NOT NULL
                    UNION
                    SELECT recorded_by as uid FROM ${tables.ANSWERS} WHERE recorded_by IS NOT NULL
                    UNION
                    SELECT user_id as uid FROM ${tables.ANSWERS} WHERE user_id IS NOT NULL
                ) t
            `);
            const contributors = contribRes.rows && contribRes.rows[0] ? Number(contribRes.rows[0].cnt || 0) : 0;

            // tiers: derive from ${tables.FACILITIES}.category and map to care_levels where possible
            const tierRows = await pool.query(`SELECT category, COUNT(*)::int as cnt FROM ${tables.FACILITIES} GROUP BY category`);
            const tiers = [];
            let otherCount = 0;
            try {
                const metaDir = path.join(__dirname, '..', 'public', 'metadata');
                const carePath = path.join(metaDir, 'care_levels.json');
                let careLevels = [];
                if (fs.existsSync(carePath)) careLevels = JSON.parse(fs.readFileSync(carePath, 'utf8'));
                const careIds = (careLevels || []).map((c) => (c.id || String(c.name || '')).toString().toLowerCase());
                for (const r of tierRows.rows) {
                    const name = String(r.category || 'other');
                    const key = name.toLowerCase();
                    if (careIds.includes(key)) {
                        const pct = total > 0 ? Math.round((Number(r.cnt) / total) * 100) : 0;
                        tiers.push({ name: name, count: Number(r.cnt), percent: pct });
                    } else {
                        otherCount += Number(r.cnt);
                    }
                }
            } catch (e) {
                for (const r of tierRows.rows) { otherCount += Number(r.cnt); }
            }
            if (otherCount > 0) tiers.push({ name: 'Other', count: otherCount, percent: total > 0 ? Math.round((otherCount / total) * 100) : 0 });

            // functional status: based on latest ${tables.ANSWERS} for question_id = 'q_energy_resilience'
            const bandsSql = `SELECT DISTINCT ON (facility_id) facility_id, answer_value FROM ${tables.ANSWERS} WHERE question_id = $1 AND answer_value IS NOT NULL ORDER BY facility_id, created_at DESC`;
            const bres = await pool.query(bandsSql, ['q_energy_resilience']);
            const funcCounts = { fully: 0, partial: 0, none: 0 };
            for (const r of bres.rows) {
                let v = r.answer_value;
                if (typeof v === 'string') {
                    try { v = JSON.parse(v); } catch (e) { /* keep string */ }
                }
                let band = null;
                if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'band')) band = String(v.band || '').toLowerCase();
                else if (typeof v === 'string') band = String(v).toLowerCase();
                if (band === 'green') funcCounts.fully += 1;
                else if (band === 'yellow') funcCounts.partial += 1;
                else if (band === 'red') funcCounts.none += 1;
                else funcCounts.partial += 0; // unknowns ignored
            }
            const funcTotal = funcCounts.fully + funcCounts.partial + funcCounts.none;
            const functional = [
                { name: 'Fully functional', percent: funcTotal ? Math.round((funcCounts.fully / funcTotal) * 100) : 0 },
                { name: 'Partially functional', percent: funcTotal ? Math.round((funcCounts.partial / funcTotal) * 100) : 0 },
                { name: 'Not functional', percent: funcTotal ? Math.round((funcCounts.none / funcTotal) * 100) : 0 }
            ];

            // Respond with a sensible structure
            res.json({ country: 'Nigeria', totalFacilities: total, contributors, tiers, functional });
        } catch (e) {
            console.error('facility_summary error', e);
            res.status(500).json({ error: String(e) });
        }
    });

// Allow skipping DB init for metadata-only development by setting SKIP_DB_ON_INIT=true
if (process.env.SKIP_DB_ON_INIT === 'true') {
    console.warn('SKIP_DB_ON_INIT=true; skipping database initialization and starting server in degraded mode.');
    try {
        console.log(`[startup] Configured SERVER_PORT=${PORT}`);
        try { console.log(`[startup] Configured FRONTEND_PORT=${frontendPort}`); } catch (e) { }
        const allowedOrigin = `http://localhost:${(typeof frontendPort !== 'undefined' ? frontendPort : (process.env.FRONTEND_PORT || 5173))}`;
        console.log(`[startup] CORS allowed origin: ${allowedOrigin}`);
    } catch (e) { }
    app.listen(PORT, () => {
        console.log(`Server running (DB init skipped) on port ${PORT}`);
    });
} else {
    initDb()
        .then(() => {
            try {
                console.log(`[startup] Configured SERVER_PORT=${PORT}`);
                try { console.log(`[startup] Configured FRONTEND_PORT=${frontendPort}`); } catch (e) { }
                const allowedOrigin = `http://localhost:${(typeof frontendPort !== 'undefined' ? frontendPort : (process.env.FRONTEND_PORT || 5173))}`;
                console.log(`[startup] CORS allowed origin: ${allowedOrigin}`);
            } catch (e) { }
            app.listen(PORT, () => {
                logStartupInfo();
                console.log(`Server running on port ${PORT}`);
            });
        })
        .catch(err => {
            console.error('Failed to initialize database. Server not started.', err);
            process.exit(1);
        });
}
