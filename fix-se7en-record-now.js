const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fix Se7en record ===\n');

const se7en = db.prepare('SELECT id, department FROM users WHERE username = ?').get('code001');
const today = new Date().toISOString().split('T')[0];

// Delete bad record
db.prepare('DELETE FROM routine_records WHERE user_id = ? AND date = ?').run(se7en.id, today);
console.log('Deleted bad record');

// Get template
const template = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1')
  .get(se7en.department);

// Create correct record with completed = true
const items = JSON.parse(template.items).map(text => ({ text, completed: true }));
const recordId = 'routine-' + Date.now();
const now = new Date().toISOString();

db.prepare('INSERT INTO routine_records (id, user_id, department_id, template_id, date, completed_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .run(recordId, se7en.id, se7en.department, template.id, today, JSON.stringify(items), now);

console.log('Created correct record:', recordId);
console.log('Items:', JSON.stringify(items));

// Verify
const verify = db.prepare('SELECT completed_items FROM routine_records WHERE id = ?').get(recordId);
console.log('Verification:', verify.completed_items);

db.close();
