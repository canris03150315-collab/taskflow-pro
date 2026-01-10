const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Test /today API logic ===');

// Simulate the API logic
const userId = 'admin-1766955365557'; // Se7en
const userDept = 'TECH'; // System Tech Department
const today = new Date().toISOString().split('T')[0];

console.log('User:', userId);
console.log('Department:', userDept);
console.log('Today:', today);

// Check for existing record
let existing = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?')
  .get(userId, today, userDept);

console.log('\nExisting record:', existing ? 'Found' : 'Not found');

if (!existing) {
  // Check for daily task templates
  const templates = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1')
    .all(userDept);
  
  console.log('Daily task templates found:', templates.length);
  
  if (templates.length > 0) {
    console.log('Template:', templates[0].title);
    console.log('Items:', templates[0].items);
    console.log('\nAPI will auto-create record on first access');
  } else {
    console.log('\nNo daily task templates found for this department');
  }
} else {
  console.log('Record ID:', existing.id);
  console.log('Items:', existing.items);
}

db.close();
console.log('\n=== Test complete ===');
