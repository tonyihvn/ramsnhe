const pg = require('pg');
const pool = new pg.Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dqappdb',
  password: 'admin',
  port: 5432
});

pool.query(`
  SELECT id, question_id, answer_value, answer_row_index 
  FROM dqai_answers 
  LIMIT 5
`)
  .then(res => {
    console.log('Database columns check:');
    if (res.rows.length > 0) {
      console.log('Sample row keys:', Object.keys(res.rows[0]));
      console.log('\nFirst 3 rows:');
      res.rows.slice(0, 3).forEach((row, i) => {
        console.log(`\nRow ${i + 1}:`);
        console.log('  question_id:', row.question_id);
        console.log('  answer_row_index (column):', row.answer_row_index);
        console.log('  answer_value type:', typeof row.answer_value);
        console.log('  answer_value:', JSON.stringify(row.answer_value, null, 2));
      });
    } else {
      console.log('No answers found in database');
    }
    pool.end();
  })
  .catch(e => {
    console.error('Error:', e.message);
    pool.end();
  });
