const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Simple test: create record with correct format ===');

const se7en = db.prepare('SELECT id, department FROM users WHERE username = ?').get('code001');
const today = new Date().toISOString().split('T')[0];

// Get template
const template = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1')
  .get(se7en.department);

if (!template) {
  console.log('No template found');
  db.close();
  process.exit(1);
}

console.log('Template:', template.title);
console.log('Template items:', template.items);

// Parse and transform
const templateItems = JSON.parse(template.items);
console.log('Parsed:', templateItems);

const items = templateItems.map(text => ({ text, completed: false }));
console.log('Transformed:', JSON.stringify(items, null, 2));

// Create record
const recordId = 'routine-' + Date.now();
const now = new Date().toISOString();

db.prepare('INSERT INTO routine_records (id, user_id, department_id, template_id, date, completed_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .run(recordId, se7en.id, se7en.department, template.id, today, JSON.stringify(items), now);

console.log('\nRecord created:', recordId);

// Verify
const verify = db.prepare('SELECT * FROM routine_records WHERE id = ?').get(recordId);
console.log('Saved completed_items:', verify.completed_items);

const parsed = JSON.parse(verify.completed_items);
console.log('Parsed back:', JSON.stringify(parsed, null, 2));
console.log('Has text property:', !!parsed[0].text);
console.log('Has completed property:', typeof parsed[0].completed === 'boolean');

db.close();
console.log('\n=== Test successful ===');
