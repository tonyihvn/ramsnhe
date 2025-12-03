#!/usr/bin/env node
// Standalone seeder: create program, activity, questions and per-facility reports/answers
// Usage: set DB env vars and run `node server/scripts/seed_activity.js`

(async () => {
  try {
    const { Pool } = await import('pg');
    const crypto = await import('crypto');

    const DB_HOST = process.env.DB_HOST || process.env.DATABASE_HOST;
    const DB_USER = process.env.DB_USER || process.env.DATABASE_USER;
    const DB_PASSWORD = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD;
    const DB_NAME = process.env.DB_NAME || process.env.DATABASE_NAME;
    const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : (process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 5432);

    if (!DB_HOST || !DB_USER || !DB_NAME) {
      console.error('Missing DB env vars. Please set DB_HOST, DB_USER, DB_NAME (and DB_PASSWORD if needed)');
      process.exit(1);
    }

    const pool = new Pool({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME });
    console.log('Connected to DB');

    // Ensure minimal tables exist
    await pool.query(`CREATE TABLE IF NOT EXISTS dqai_programs (id SERIAL PRIMARY KEY, name TEXT, details TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS dqai_activities (id SERIAL PRIMARY KEY, title TEXT, program_id INTEGER, form_definition JSONB, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS dqai_questions (id TEXT PRIMARY KEY, activity_id INTEGER, question_text TEXT, answer_type TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS dqai_facilities (id SERIAL PRIMARY KEY, name TEXT, state TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS dqai_activity_reports (id SERIAL PRIMARY KEY, activity_id INTEGER, facility_id INTEGER, submission_date TIMESTAMP DEFAULT NOW(), reported_by INTEGER, overall_score NUMERIC, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS dqai_answers (id SERIAL PRIMARY KEY, report_id INTEGER, question_id TEXT, answer_value JSONB, created_at TIMESTAMP DEFAULT NOW())`);

    // Create program if not exists
    const programName = 'Energy Audit Program';
    let program = (await pool.query('SELECT * FROM dqai_programs WHERE name = $1 LIMIT 1', [programName])).rows[0];
    if (!program) {
      const r = await pool.query('INSERT INTO dqai_programs (name, details) VALUES ($1,$2) RETURNING *', [programName, 'Program for seeding energy audit activity across states']);
      program = r.rows[0];
      console.log('Created program', program.id);
    } else {
      console.log('Program already exists', program.id);
    }

    // Create activity
    const activityTitle = 'Energy Audit';
    let activity = (await pool.query('SELECT * FROM dqai_activities WHERE title = $1 LIMIT 1', [activityTitle])).rows[0];
    if (!activity) {
      const formDef = { id: `fd-${Date.now()}`, pages: [{ id: 'p1', name: 'Main', sections: [{ id: 's1', name: 'Section 1', questions: [
              ] }]}] };

      const ar = await pool.query('INSERT INTO dqai_activities (title, program_id, form_definition) VALUES ($1,$2,$3) RETURNING *', [activityTitle, program.id, formDef]);
      activity = ar.rows[0];
      console.log('Created activity', activity.id);

      // insert questions
      const questions = [
             ];
      for (const q of questions) {
        try {
          await pool.query('INSERT INTO dqai_questions (id, activity_id, question_text, answer_type) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, answer_type = EXCLUDED.answer_type', [q.id, q.activity_id, q.question_text, q.answer_type]);
        } catch (e) { console.error('Failed to insert question', e); }
      }
    } else {
      console.log('Activity already exists', activity.id);
    }

    // Ensure 36 facilities (Nigerian states) exist. If fewer, create missing ones with random coords inside Nigeria bbox
    const states = [
      'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
    ];

    const existingFacilities = (await pool.query('SELECT * FROM dqai_facilities')).rows;
    const existingStates = new Set(existingFacilities.map(f => String(f.state || '').trim()).filter(Boolean));
    for (const st of states) {
      if (existingStates.has(st)) continue;
      // random lat/lng roughly inside Nigeria
      const lat = (Math.random() * (13.9 - 4.2) + 4.2).toFixed(5);
      const lng = (Math.random() * (14.6 - 2.7) + 2.7).toFixed(5);
      await pool.query('INSERT INTO dqai_facilities (name, state, lat, lng) VALUES ($1,$2,$3,$4)', [`Facility - ${st}`, st, Number(lat), Number(lng)]);
    }
    console.log('Ensured 36 state facilities exist');

    const facilities = (await pool.query('SELECT * FROM dqai_facilities ORDER BY id')).rows;

    // For each facility create a report and answers (if not already exist for this activity)
    for (const f of facilities) {
      // check if report exists
      const exist = (await pool.query('SELECT * FROM dqai_activity_reports WHERE activity_id = $1 AND facility_id = $2 LIMIT 1', [activity.id, f.id])).rows[0];
      if (exist) continue;

      const score = Math.round(Math.random() * 40 + 60); // 60-100
      const rres = await pool.query('INSERT INTO dqai_activity_reports (activity_id, facility_id, submission_date, overall_score) VALUES ($1,$2,$3,$4) RETURNING *', [activity.id, f.id, new Date(), score]);
      const report = rres.rows[0];

      // Insert answers
      const energy = Math.round(Math.random() * 40 + 60); // 60-100
      const telemetry = Math.round(Math.random() * 40 + 50); // 50-90
      const compliance = Math.random() > 0.7 ? 'Non-compliant' : (Math.random() > 0.4 ? 'Partial' : 'Compliant');

      const answers = [
        { question_id: 'q_energy_resilience', value: energy },
        { question_id: 'q_compliance_status', value: compliance },
        { question_id: 'q_telemetry_uptime', value: telemetry }
      ];
      for (const a of answers) {
        try {
          await pool.query('INSERT INTO dqai_answers (report_id, question_id, answer_value) VALUES ($1,$2,$3)', [report.id, a.question_id, a.value]);
        } catch (e) { console.error('Failed to insert answer', e); }
      }
    }

    console.log('Seeding complete');
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Seeder failed', e);
    process.exit(1);
  }
})();
