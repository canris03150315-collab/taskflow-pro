const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Generate test token and simulate API call ===');

// Get Se7en user
const se7en = db.prepare('SELECT * FROM users WHERE username = ?').get('code001');
console.log('User:', se7en.name);
console.log('User ID:', se7en.id);
console.log('Department:', se7en.department);

// Simulate the exact API logic
const userId = se7en.id;
const userDept = se7en.department;
const today = new Date().toISOString().split('T')[0];

console.log('\n--- Simulating GET /api/routines/today ---');
console.log('Today:', today);

// Step 1: Check existing record
let existing = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?')
  .get(userId, today, userDept);

console.log('\nExisting record:', existing ? 'Found' : 'Not found');

if (existing) {
  console.log('Record ID:', existing.id);
  console.log('completed_items (raw):', existing.completed_items);
  
  // Parse and format response
  const record = {
    id: existing.id,
    userId: existing.user_id,
    templateId: existing.template_id,
    date: existing.date,
    items: JSON.parse(existing.completed_items || '[]'),
    completedAt: existing.completed_at
  };
  
  console.log('\n--- API Response ---');
  console.log(JSON.stringify(record, null, 2));
  
  console.log('\n--- Validation ---');
  console.log('items is array:', Array.isArray(record.items));
  console.log('items.length:', record.items.length);
  if (record.items.length > 0) {
    console.log('First item:', record.items[0]);
    console.log('Has text property:', !!record.items[0].text);
    console.log('Has completed property:', typeof record.items[0].completed === 'boolean');
  }
} else {
  console.log('\nNo record found - API would return null');
}

db.close();
console.log('\n=== Test complete ===');
