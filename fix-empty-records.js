const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fix empty records ===');

const today = new Date().toISOString().split('T')[0];

// Find all records with invalid items
const badRecords = db.prepare(`
  SELECT r.*, u.name as user_name, d.name as dept_name
  FROM routine_records r
  JOIN users u ON r.user_id = u.id
  JOIN departments d ON r.department_id = d.id
  WHERE r.date = ? AND (r.completed_items = '[false]' OR r.completed_items = '[true]' OR r.completed_items = '[]')
`).all(today);

console.log(`Found ${badRecords.length} bad records:\n`);

badRecords.forEach(r => {
  console.log(`- ${r.user_name} (${r.dept_name})`);
  console.log(`  Items: ${r.completed_items}`);
  
  // Check if department has daily tasks
  const templates = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1')
    .all(r.department_id);
  
  if (templates.length === 0) {
    console.log(`  Action: DELETE (no daily tasks for this department)`);
    db.prepare('DELETE FROM routine_records WHERE id = ?').run(r.id);
  } else {
    console.log(`  Action: KEEP (department has daily tasks, but record is corrupted)`);
    // Delete and let it be recreated correctly
    db.prepare('DELETE FROM routine_records WHERE id = ?').run(r.id);
  }
  console.log('');
});

console.log('=== Fix complete ===');
db.close();
