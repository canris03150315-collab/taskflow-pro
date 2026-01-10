const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fix bad routine records ===');

// Find Se7en
const se7en = db.prepare('SELECT id, username, department FROM users WHERE username = ?').get('code001');
console.log('User:', se7en.username, 'ID:', se7en.id);

// Check the template
const template = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1').get(se7en.department);
if (template) {
  console.log('\nTemplate found:', template.title);
  console.log('Template items:', template.items);
  
  try {
    const items = JSON.parse(template.items);
    console.log('Parsed template items:', items);
  } catch (e) {
    console.log('Template parse error:', e.message);
  }
}

// Delete bad records for today
const today = new Date().toISOString().split('T')[0];
console.log('\nDeleting bad records for today:', today);

const result = db.prepare('DELETE FROM routine_records WHERE user_id = ? AND date = ?')
  .run(se7en.id, today);

console.log('Deleted records:', result.changes);

db.close();
console.log('\n=== Fix complete ===');
console.log('Next API call will auto-create a new record with correct format');
