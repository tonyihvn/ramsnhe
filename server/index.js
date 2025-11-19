import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database Connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'dqappdb',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

// Initialize database schema if tables don't exist
async function initDb() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS users (
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
        `CREATE TABLE IF NOT EXISTS programs (
            id SERIAL PRIMARY KEY,
            name TEXT,
            details TEXT,
            type TEXT,
            category TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS facilities (
            id SERIAL PRIMARY KEY,
            name TEXT,
            state TEXT,
            lga TEXT,
            address TEXT,
            category TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS activities (
            id SERIAL PRIMARY KEY,
            title TEXT,
            subtitle TEXT,
            program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
            details TEXT,
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            response_type TEXT,
            category TEXT,
            status TEXT,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            form_definition JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS activity_reports (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL,
            status TEXT,
            answers JSONB,
            reviewers_report TEXT,
            overall_score NUMERIC,
            reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            submission_date TIMESTAMP DEFAULT NOW()
        )`
        ,
        `CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
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
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS answers (
            id SERIAL PRIMARY KEY,
            report_id INTEGER REFERENCES activity_reports(id) ON DELETE CASCADE,
            activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
            question_id TEXT,
            answer_value JSONB,
            facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            answer_datetime TIMESTAMP DEFAULT NOW(),
            reviewers_comment TEXT,
            quality_improvement_followup TEXT,
            score NUMERIC,
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS uploaded_docs (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
            facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            file_content JSONB,
            filename TEXT,
            created_at TIMESTAMP DEFAULT NOW()
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
    // Ensure answers table has reviewer/score columns and remove them from questions if present
    try {
        await pool.query(`ALTER TABLE answers ADD COLUMN IF NOT EXISTS reviewers_comment TEXT`);
        await pool.query(`ALTER TABLE answers ADD COLUMN IF NOT EXISTS quality_improvement_followup TEXT`);
        await pool.query(`ALTER TABLE answers ADD COLUMN IF NOT EXISTS score NUMERIC`);
        await pool.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS required BOOLEAN`);
        // Ensure activities has response_type and form_definition (sync with schema)
        await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS response_type TEXT`);
        await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS form_definition JSONB`);
        // Remove legacy columns from questions if they exist
        await pool.query(`ALTER TABLE questions DROP COLUMN IF EXISTS reviewers_comment`);
        await pool.query(`ALTER TABLE questions DROP COLUMN IF EXISTS quality_improvement_followup`);
        await pool.query(`ALTER TABLE questions DROP COLUMN IF EXISTS score`);
        // Ensure activity_reports schema: remove uploaded_files and data_collection_level, add reviewer report fields
        await pool.query(`ALTER TABLE activity_reports DROP COLUMN IF EXISTS uploaded_files`);
        await pool.query(`ALTER TABLE activity_reports DROP COLUMN IF EXISTS data_collection_level`);
        await pool.query(`ALTER TABLE activity_reports ADD COLUMN IF NOT EXISTS reviewers_report TEXT`);
        await pool.query(`ALTER TABLE activity_reports ADD COLUMN IF NOT EXISTS overall_score NUMERIC`);
        await pool.query(`ALTER TABLE activity_reports ADD COLUMN IF NOT EXISTS reported_by INTEGER`);
    } catch (err) {
        console.error('Failed to sync reviewer/score columns between questions and answers:', err);
        throw err;
    }
    // Ensure legacy tables get required columns (safe check + alter if missing)
    try {
        const colCheck = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='password'");
        if (colCheck.rowCount === 0) {
            console.log('users.password column missing — adding column');
            await pool.query('ALTER TABLE users ADD COLUMN password TEXT');
            console.log('users.password column added');
        } else {
            console.log('users.password column already exists');
        }
    } catch (err) {
        console.error('Failed to ensure users.password column exists:', err);
        throw err;
    }
    console.log('Database initialized (tables ensured).');
    // Ensure default admin user exists
    try {
        const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin1234';
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
        if (res.rows.length === 0) {
            await pool.query(
                'INSERT INTO users (first_name, last_name, email, password, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
                ['System', 'Administrator', adminEmail, adminPassword, 'Admin', 'Active']
            );
            console.log('Default admin user created:', adminEmail);
        }
    } catch (err) {
        console.error('Failed to ensure default admin user', err);
    }
}

// Sync questions from either a form-definition object or a flat questions array into the `questions` table
async function syncQuestions(activityId, formDefOrQuestions) {
    if (!activityId) return;
    try {
        await pool.query('DELETE FROM questions WHERE activity_id = $1', [activityId]);
        const insertText = `INSERT INTO questions (id, activity_id, page_name, section_name, question_text, question_helper, answer_type, category, question_group, column_size, status, required, options, metadata, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`;

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
                const createdBy = q.createdBy || q.created_by || null;
                await pool.query(insertText, [qId, activityId, pageName, sectionName, questionText, questionHelper, answerType, category, questionGroup, columnSize, status, q.required || false, options, metadata, createdBy]);
            }
            return;
        }

        // Otherwise assume a form-definition object with pages->sections->questions
        const formDef = formDefOrQuestions || {};
        for (const page of formDef.pages || []) {
            const pageName = page.name || page.id || null;
            for (const section of page.sections || []) {
                const sectionName = section.name || section.id || null;
                for (const q of section.questions || []) {
                    const qId = q.id || q.questionId || (`q_${activityId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
                    const questionText = q.questionText || q.text || null;
                    const questionHelper = q.questionHelper || q.helper || null;
                    const answerType = q.answerType || q.type || null;
                    const category = q.category || null;
                    const questionGroup = q.questionGroup || null;
                    const columnSize = q.columnSize || null;
                    const status = q.status || 'Active';
                    const options = q.options ? JSON.stringify(q.options) : null;
                    const metadata = q.metadata ? JSON.stringify(q.metadata) : null;
                    const createdBy = q.createdBy || null;
                    await pool.query(insertText, [qId, activityId, pageName, sectionName, questionText, questionHelper, answerType, category, questionGroup, columnSize, status, q.required || false, options, metadata, createdBy]);
                }
            }
        }
    } catch (err) {
        console.error('syncQuestions error:', err);
    }
}

// Simple Session Setup (No Passport needed for dev mode)
app.use(
    cookieSession({
        name: 'session',
        keys: ['key1', 'key2'],
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    })
);

// --- Auth Routes (Dev Mode) ---

// Login Route: Simulates login by finding or creating a user with the specific role
app.post('/auth/login', async (req, res) => {
    const { role, email, password } = req.body;

    try {
        if (email && password) {
            // Authenticate by email/password
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const user = result.rows[0];
            // In dev mode we store plaintext password from init; compare directly
            if (user.password !== password) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            req.session.userId = user.id;
            return res.json(user);
        }

        // Fallback: role-based demo login (keeps old behavior)
        if (!role) return res.status(400).json({ error: 'Missing role' });
        const demoEmail = `${role.toLowerCase().replace(' ', '')}@example.com`;
        let result = await pool.query('SELECT * FROM users WHERE email = $1', [demoEmail]);

        let user;
        if (result.rows.length > 0) {
            user = result.rows[0];
        } else {
            const insertRes = await pool.query(
                'INSERT INTO users (first_name, last_name, email, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                ['Demo', role, demoEmail, role, 'Active']
            );
            user = insertRes.rows[0];
        }
        req.session.userId = user.id;
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/current_user', async (req, res) => {
    if (!req.session.userId) {
        return res.send(null);
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
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
                facilityId: u.facility_id
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
        const result = await pool.query('SELECT * FROM programs ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/programs', async (req, res) => {
    const { name, details, type, category, id } = req.body;
    try {
        if (id) {
            const result = await pool.query(
                'UPDATE programs SET name=$1, details=$2, type=$3, category=$4 WHERE id=$5 RETURNING *',
                [name, details, type, category, id]
            );
            res.json(result.rows[0]);
        } else {
            const result = await pool.query(
                'INSERT INTO programs (name, details, type, category) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, details, type, category]
            );
            res.json(result.rows[0]);
        }
    } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/programs/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM programs WHERE id = $1', [req.params.id]);
        res.sendStatus(200);
    } catch (e) { res.status(500).send(e.message); }
});

// Activities
app.get('/api/activities', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM activities ORDER BY created_at DESC');
        const mapped = result.rows.map(row => ({
            ...row,
            programId: row.program_id,
            startDate: row.start_date,
            endDate: row.end_date,
            responseType: row.response_type || row.responsetype || null,
            // form_definition removed; questions are normalized in `questions` table
        }));
        res.json(mapped);
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/activities', async (req, res) => {
    const { title, programId, details, startDate, endDate, category, status, questions, id, createdBy } = req.body;
    try {
        if (id) {
            const result = await pool.query(
                'UPDATE activities SET title=$1, subtitle=$2, program_id=$3, details=$4, start_date=$5, end_date=$6, response_type=$7, category=$8, status=$9, created_by=$10 WHERE id=$11 RETURNING *',
                [title, req.body.subtitle || null, programId, details, startDate, endDate, req.body.responseType || req.body.response_type || null, category, status, createdBy, id]
            );
            const r = result.rows[0];
            // Persist questions from form definition into questions table
            await syncQuestions(r.id, questions || []);
            res.json({ ...r, programId: r.program_id, startDate: r.start_date, endDate: r.end_date });
        } else {
            const result = await pool.query(
                'INSERT INTO activities (title, subtitle, program_id, details, start_date, end_date, response_type, category, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
                [title, req.body.subtitle || null, programId, details, startDate, endDate, req.body.responseType || req.body.response_type || null, category, status, createdBy]
            );
            const r = result.rows[0];
            // Persist questions from form definition into questions table
            await syncQuestions(r.id, questions || []);
            res.json({ ...r, programId: r.program_id, startDate: r.start_date, endDate: r.end_date });
        }
    } catch (e) { res.status(500).send(e.message); }
});

app.put('/api/activities/:id/form', async (req, res) => {
    const { questions } = req.body;
    try {
        // No form_definition column to update; sync the provided questions into questions table
        await syncQuestions(req.params.id, questions || []);
        const updated = (await pool.query('SELECT * FROM activities WHERE id = $1', [req.params.id])).rows[0];
        res.json(updated);
    } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/activities/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM activities WHERE id = $1', [req.params.id]);
        res.sendStatus(200);
    } catch (e) { res.status(500).send(e.message); }
});

// Facilities
app.get('/api/facilities', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM facilities ORDER BY name ASC');
        res.json(result.rows);
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/facilities', async (req, res) => {
    const { name, state, lga, address, category, id } = req.body;
    try {
        if (id) {
            const result = await pool.query(
                'UPDATE facilities SET name=$1, state=$2, lga=$3, address=$4, category=$5 WHERE id=$6 RETURNING *',
                [name, state, lga, address, category, id]
            );
            res.json(result.rows[0]);
        } else {
            const result = await pool.query(
                'INSERT INTO facilities (name, state, lga, address, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [name, state, lga, address, category]
            );
            res.json(result.rows[0]);
        }
    } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/facilities/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM facilities WHERE id = $1', [req.params.id]);
        res.sendStatus(200);
    } catch (e) { res.status(500).send(e.message); }
});

// Users
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
        const mapped = result.rows.map(r => ({
            ...r,
            firstName: r.first_name,
            lastName: r.last_name
        }));
        res.json(mapped);
    } catch (e) { res.status(500).send(e.message); }
});

// Create or update user
app.post('/api/users', async (req, res) => {
    const { id, firstName, lastName, email, role, status, phoneNumber, password, facilityId } = req.body;
    try {
        if (id) {
            const result = await pool.query(
                'UPDATE users SET first_name=$1, last_name=$2, email=$3, role=$4, status=$5, password=$6, facility_id=$7 WHERE id=$8 RETURNING *',
                [firstName, lastName, email, role, status, password || null, facilityId || null, id]
            );
            const u = result.rows[0];
            res.json({ ...u, firstName: u.first_name, lastName: u.last_name });
        } else {
            const result = await pool.query(
                'INSERT INTO users (first_name, last_name, email, role, status, password, facility_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [firstName, lastName, email, role, status, password || null, facilityId || null]
            );
            const u = result.rows[0];
            res.json({ ...u, firstName: u.first_name, lastName: u.last_name });
        }
    } catch (e) { console.error(e); res.status(500).send(e.message); }
});

// Reports
app.get('/api/reports', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM activity_reports ORDER BY submission_date DESC');
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
        const result = await pool.query('SELECT * FROM activity_reports WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).send('Report not found');
        const r = result.rows[0];
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

// Get uploaded_docs by activityId or facilityId or userId
app.get('/api/uploaded_docs', async (req, res) => {
    const { activityId, facilityId, userId } = req.query;
    try {
        const clauses = [];
        const params = [];
        let idx = 1;
        if (activityId) { clauses.push(`activity_id = $${idx++}`); params.push(activityId); }
        if (facilityId) { clauses.push(`facility_id = $${idx++}`); params.push(facilityId); }
        if (userId) { clauses.push(`user_id = $${idx++}`); params.push(userId); }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `SELECT * FROM uploaded_docs ${where} ORDER BY created_at DESC`;
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (e) { res.status(500).send(e.message); }
});

// Questions endpoint: get questions by activity
app.get('/api/questions', async (req, res) => {
    const { activityId } = req.query;
    try {
        if (!activityId) return res.status(400).send('Missing activityId');
        const result = await pool.query('SELECT * FROM questions WHERE activity_id = $1 ORDER BY created_at ASC', [activityId]);
        res.json(result.rows.map(q => ({
            id: q.id,
            activityId: q.activity_id,
            pageName: q.page_name,
            sectionName: q.section_name,
            questionText: q.question_text,
            questionHelper: q.question_helper,
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
        const sql = `SELECT * FROM answers ${where} ORDER BY created_at DESC`;
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (e) { res.status(500).send(e.message); }
});

// Activity dashboard aggregation endpoint
app.get('/api/activity_dashboard/:activityId', async (req, res) => {
    const { activityId } = req.params;
    try {
        const activityRes = await pool.query('SELECT * FROM activities WHERE id = $1', [activityId]);
        if (activityRes.rowCount === 0) return res.status(404).send('Activity not found');
        const activity = activityRes.rows[0];

        const questionsRes = await pool.query('SELECT * FROM questions WHERE activity_id = $1 ORDER BY created_at ASC', [activityId]);
        const questions = questionsRes.rows;

        const reportsRes = await pool.query('SELECT * FROM activity_reports WHERE activity_id = $1 ORDER BY submission_date DESC', [activityId]);
        const reports = reportsRes.rows;

        const answersRes = await pool.query('SELECT * FROM answers WHERE activity_id = $1 ORDER BY created_at DESC', [activityId]);
        const answers = answersRes.rows;

        const docsRes = await pool.query('SELECT * FROM uploaded_docs WHERE activity_id = $1 ORDER BY created_at DESC', [activityId]);
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
    const allowed = ['status'];
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
    const sql = `UPDATE questions SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`;
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
    const sql = `UPDATE answers SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`;
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
        const docRes = await pool.query('SELECT * FROM uploaded_docs WHERE id = $1', [id]);
        if (docRes.rowCount === 0) return res.status(404).json({ error: 'uploaded_doc not found' });
        const doc = docRes.rows[0];
        const content = doc.file_content || [];
        if (!Array.isArray(content)) return res.status(400).json({ error: 'file_content must be an array of rows' });
        if (typeof rowIndex !== 'number' || rowIndex < 0 || rowIndex >= content.length) return res.status(400).json({ error: 'rowIndex out of range' });
        const row = content[rowIndex] || {};
        row[colKey] = newValue;
        content[rowIndex] = row;
        await pool.query('UPDATE uploaded_docs SET file_content = $1 WHERE id = $2', [JSON.stringify(content), id]);
        res.json({ success: true, file_content: content });
    } catch (err) {
        console.error('Failed to update uploaded_doc', err);
        res.status(500).json({ error: 'Failed to update uploaded_doc' });
    }
});

app.post('/api/reports', async (req, res) => {
    const { activityId, userId, facilityId, status, answers, uploadedFiles } = req.body;
    try {
        // Validate entity linking per activity response type
        try {
            const actRes = await pool.query('SELECT response_type FROM activities WHERE id = $1', [activityId]);
            if (actRes.rowCount === 0) return res.status(400).send('Invalid activityId');
            const respType = (actRes.rows[0].response_type || '').toString().toLowerCase();
            if (respType === 'facility' && !facilityId) return res.status(400).send('facilityId is required for this activity');
            if (respType === 'user' && !userId) return res.status(400).send('userId is required for this activity');
        } catch (err) {
            console.error('Failed to validate activity response type', err);
        }
        // Insert report row
        const result = await pool.query(
            'INSERT INTO activity_reports (activity_id, user_id, facility_id, status, answers) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [activityId, userId, facilityId, status, answers || null]
        );
        const report = result.rows[0];

        // Persist uploaded files into uploaded_docs table (one row per file)
        try {
            if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
                for (const file of uploadedFiles) {
                    try {
                        const filename = file.name || file.filename || null;
                        const content = file.content || file.data || file; // expect JSON-able representation
                        await pool.query('INSERT INTO uploaded_docs (activity_id, facility_id, user_id, uploaded_by, file_content, filename) VALUES ($1,$2,$3,$4,$5,$6)', [activityId, facilityId, userId || null, req.session.userId || null, JSON.stringify(content), filename]);
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
                        await pool.query('INSERT INTO answers (report_id, activity_id, question_id, answer_value, facility_id, user_id, recorded_by, answer_datetime, reviewers_comment, quality_improvement_followup, score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [report.id, activityId, qId, JSON.stringify(answerVal), facilityId || null, userId || null, req.session.userId || null, new Date(), reviewersComment, qiFollowup, score]);
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
initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to initialize database. Server not started.', err);
        process.exit(1);
    });