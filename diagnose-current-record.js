const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnose current record ===');

const se7en = db.prepare('SELECT id FROM users WHERE username = ?').get('code001');
const today = new Date().toISOString().split('T')[0];

const record = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?')
  .get(se7en.id, today);

if (!record) {
  console.log('ERROR: No record found');
  db.close();
  process.exit(1);
}

console.log('Record ID:', record.id);
console.log('completed_items (raw):', record.completed_items);
console.log('Type:', typeof record.completed_items);

try {
  const items = JSON.parse(record.completed_items || '[]');
  console.log('\nParsed items:', JSON.stringify(items, null, 2));
  console.log('Items count:', items.length);
  
  if (items.length > 0) {
    console.log('\nFirst item:');
    console.log('  Type:', typeof items[0]);
    console.log('  Value:', items[0]);
    console.log('  Has text property:', !!items[0].text);
    console.log('  Has completed property:', typeof items[0].completed);
  }
} catch (e) {
  console.log('Parse error:', e.message);
}

// Check template
const template = db.prepare('SELECT * FROM routine_templates WHERE id = ?').get(record.template_id);
if (template) {
  console.log('\nTemplate items:', template.items);
  const templateItems = JSON.parse(template.items);
  console.log('Template items parsed:', templateItems);
}

db.close();
console.log('\n=== Diagnosis complete ===');
