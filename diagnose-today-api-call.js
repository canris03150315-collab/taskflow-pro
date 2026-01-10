const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Simulate exact API call for Se7en ===');

const userId = 'code001-1736500800000'; // Need to find exact ID
const userDept = 'cbsv402gc';
const today = new Date().toISOString().split('T')[0];

// Find Se7en's exact user ID
const se7en = db.prepare('SELECT id, username, name, department FROM users WHERE username = ?').get('code001');

if (!se7en) {
  console.log('ERROR: Se7en user not found');
  db.close();
  process.exit(1);
}

console.log('User found:', se7en.name);
console.log('User ID:', se7en.id);
console.log('Department:', se7en.department);
console.log('Today:', today);

// Step 1: Check for existing record
console.log('\n--- Step 1: Check existing record ---');
let existing = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?')
  .get(se7en.id, today, se7en.department);

if (existing) {
  console.log('Found existing record:', existing.id);
  console.log('Items:', existing.items);
} else {
  console.log('No existing record found');
  
  // Step 2: Check for daily templates
  console.log('\n--- Step 2: Check daily templates ---');
  const templates = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1')
    .all(se7en.department);
  
  console.log('Daily templates found:', templates.length);
  
  if (templates.length > 0) {
    templates.forEach(t => {
      console.log(`- ${t.title} (ID: ${t.id})`);
      console.log(`  Items: ${t.items}`);
    });
    
    console.log('\n--- Step 3: Simulate auto-create ---');
    const template = templates[0];
    const recordId = 'routine-test-' + Date.now();
    const items = JSON.parse(template.items || '[]').map(text => ({ text, completed: false }));
    
    console.log('Would create record:');
    console.log('- Record ID:', recordId);
    console.log('- User ID:', se7en.id);
    console.log('- Dept ID:', se7en.department);
    console.log('- Template ID:', template.id);
    console.log('- Date:', today);
    console.log('- Items:', JSON.stringify(items));
  } else {
    console.log('No daily templates found - cannot auto-create');
  }
}

db.close();
console.log('\n=== Diagnosis complete ===');
