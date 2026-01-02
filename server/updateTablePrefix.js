#!/usr/bin/env node
/**
 * Script to replace all dqai_ table references with dynamic TABLE_PREFIX
 * Usage: node updateTablePrefix.js <file_path>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of all tables with their replacements
const tableReplacements = [
    { old: 'dqai_audit_logs', new: '${tables.AUDIT_LOGS}' },
    { old: 'dqai_answers', new: '${tables.ANSWERS}' },
    { old: 'dqai_activity_reports', new: '${tables.ACTIVITY_REPORTS}' },
    { old: 'dqai_activities', new: '${tables.ACTIVITIES}' },
    { old: 'dqai_businesses', new: '${tables.BUSINESSES}' },
    { old: 'dqai_dataset_content', new: '${tables.DATASET_CONTENT}' },
    { old: 'dqai_datasets', new: '${tables.DATASETS}' },
    { old: 'dqai_feedback_messages', new: '${tables.FEEDBACK_MESSAGES}' },
    { old: 'dqai_form_schemas', new: '${tables.FORM_SCHEMAS}' },
    { old: 'dqai_landing_page_config', new: '${tables.LANDING_PAGE_CONFIG}' },
    { old: 'dqai_llm_providers', new: '${tables.LLM_PROVIDERS}' },
    { old: 'dqai_page_permissions', new: '${tables.PAGE_PERMISSIONS}' },
    { old: 'dqai_programs', new: '${tables.PROGRAMS}' },
    { old: 'dqai_questions', new: '${tables.QUESTIONS}' },
    { old: 'dqai_rag_schemas', new: '${tables.RAG_SCHEMAS}' },
    { old: 'dqai_report_templates', new: '${tables.REPORT_TEMPLATES}' },
    { old: 'dqai_settings', new: '${tables.SETTINGS}' },
    { old: 'dqai_uploaded_docs', new: '${tables.UPLOADED_DOCS}' },
    { old: 'dqai_user_approvals', new: '${tables.USER_APPROVALS}' },
    { old: 'dqai_users', new: '${tables.USERS}' },
    { old: 'dqai_facilities', new: '${tables.FACILITIES}' },
];

function updateFile(filePath) {
    try {
        console.log(`📝 Processing: ${filePath}`);
        
        let content = fs.readFileSync(filePath, 'utf-8');
        let updated = content;
        let changeCount = 0;

        // Replace all table references
        for (const replacement of tableReplacements) {
            const regex = new RegExp(replacement.old, 'g');
            const newContent = updated.replace(regex, replacement.new);
            if (newContent !== updated) {
                changeCount += (updated.match(regex) || []).length;
                updated = newContent;
            }
        }

        if (changeCount > 0) {
            // Check if file already imports tables
            if (!updated.includes("import { tables }") && !updated.includes('import {tables}')) {
                // Add import at the top after other imports
                const importMatch = updated.match(/^import\s+(?:{[^}]+}|[^\s]+)\s+from\s+['"][^'"]+['"]/m);
                if (importMatch) {
                    const lastImportMatch = Array.from(updated.matchAll(/^import\s+(?:{[^}]+}|[^\s]+)\s+from\s+['"][^'"]+['"]/gm)).pop();
                    if (lastImportMatch) {
                        const endPos = lastImportMatch.index + lastImportMatch[0].length;
                        updated = updated.slice(0, endPos) + "\nimport { tables } from './tablePrefix.js';" + updated.slice(endPos);
                        changeCount++;
                    }
                }
            }

            fs.writeFileSync(filePath, updated, 'utf-8');
            console.log(`✅ Updated ${filePath}: ${changeCount} replacements made`);
            return true;
        } else {
            console.log(`⏭️  No changes needed for ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

async function main() {
    const filesToUpdate = [
        path.join(__dirname, 'superAdminRoutes.js'),
        path.join(__dirname, 'index.js'),
        path.join(__dirname, 'scripts', 'seed_activity.js'),
    ];

    console.log('\n🔄 Starting TABLE_PREFIX update process...\n');
    
    let successCount = 0;
    for (const file of filesToUpdate) {
        if (fs.existsSync(file)) {
            if (updateFile(file)) {
                successCount++;
            }
        } else {
            console.log(`⚠️  File not found: ${file}`);
        }
    }

    console.log(`\n✨ Complete! Updated ${successCount} files with TABLE_PREFIX`);
}

main().catch(console.error);
