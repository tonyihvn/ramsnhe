import pg from 'pg';

const { Pool } = pg;

// Database connection
const pool = new Pool({
  user: 'postgres',
  password: 'admin',
  host: 'localhost',
  port: 5432,
  database: 'dqappdb'
});

async function checkIndicators() {
  try {
    // Get all indicators
    const result = await pool.query(`
      SELECT id, name, activity_id, show_on_map, formula, formula_type, category 
      FROM nherams_indicators 
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    console.log('=== INDICATORS IN DATABASE ===');
    result.rows.forEach(row => {
      console.log(`
ID: ${row.id}
Name: ${row.name}
Activity ID: ${row.activity_id}
Show on Map: ${row.show_on_map}
Formula: ${row.formula}
Formula Type: ${row.formula_type}
Category: ${row.category}
---`);
    });
    
    // Check if there are any indicators with show_on_map = true
    const showOnMapResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM nherams_indicators 
      WHERE show_on_map = true
    `);
    
    console.log(`\nIndicators with show_on_map = true: ${showOnMapResult.rows[0].count}`);
    
    // Check activity count
    const activityResult = await pool.query(`
      SELECT id, name FROM nherams_activities LIMIT 5
    `);
    
    console.log('\n=== FIRST 5 ACTIVITIES ===');
    activityResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: ${row.name}`);
    });
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

checkIndicators();
