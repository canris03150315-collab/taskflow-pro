const fs = require('fs');
const Database = require('./node_modules/better-sqlite3');

console.log('=== Full System Diagnosis ===\n');

// 1. Check routines.js routes
console.log('--- 1. Backend Routes Check ---');
const routinesPath = '/app/dist/routes/routines.js';
const routinesContent = fs.readFileSync(routinesPath, 'utf8');

const hasToggle = routinesContent.includes("/records/:recordId/toggle");
const hasToday = routinesContent.includes("'/today'");
console.log('Has /today route:', hasToday);
console.log('Has /toggle route:', hasToggle);

// 2. Check database
console.log('\n--- 2. Database Check ---');
const db = new Database('/app/data/taskflow.db');

// Check Se7en's record
const se7en = db.prepare('SELECT id, department FROM users WHERE username = ?').get('code001');
console.log('Se7en ID:', se7en?.id);
console.log('Se7en Dept:', se7en?.department);

const today = new Date().toISOString().split('T')[0];
const record = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?')
  .get(se7en.id, today);

if (record) {
  console.log('\nToday record found:');
  console.log('  ID:', record.id);
  console.log('  completed_items:', record.completed_items);
  
  try {
    const items = JSON.parse(record.completed_items);
    console.log('  Format correct:', items.length > 0 && typeof items[0] === 'object' && items[0].text !== undefined);
  } catch (e) {
    console.log('  Parse error:', e.message);
  }
} else {
  console.log('\nNo record for today');
}

// 3. Check template
console.log('\n--- 3. Template Check ---');
const template = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1')
  .get(se7en.department);

if (template) {
  console.log('Template:', template.title);
  console.log('Items:', template.items);
} else {
  console.log('No daily template found');
}

db.close();

// 4. Check toggle route implementation
console.log('\n--- 4. Toggle Route Implementation ---');
const toggleMatch = routinesContent.match(/router\.post\('\/records\/:recordId\/toggle'[\s\S]*?\}\);/);
if (toggleMatch) {
  console.log('Toggle route found, length:', toggleMatch[0].length, 'chars');
  console.log('Preview:', toggleMatch[0].substring(0, 200) + '...');
} else {
  console.log('Toggle route NOT FOUND - this is the problem!');
}

console.log('\n=== Diagnosis Complete ===');
