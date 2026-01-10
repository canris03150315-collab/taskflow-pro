const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Simulate new record creation ===');

const se7en = db.prepare('SELECT id, department FROM users WHERE username = ?').get('code001');
const today = new Date().toISOString().split('T')[0];

console.log('User ID:', se7en.id);
console.log('Department:', se7en.department);
console.log('Today:', today);

// Check for existing record
let existing = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?')
  .get(se7en.id, today, se7en.department);

console.log('\nExisting record:', existing ? 'Found' : 'Not found');

if (!existing) {
  // Get template
  const templates = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1')
    .all(se7en.department);
  
  console.log('Templates found:', templates.length);
  
  if (templates.length > 0) {
    const template = templates[0];
    console.log('\nUsing template:', template.title);
    console.log('Template items (raw):', template.items);
    
    // Parse and transform
    const templateItems = JSON.parse(template.items || '[]');
    console.log('Template items (parsed):', templateItems);
    
    const items = templateItems.map(text => ({ text, completed: false }));
    console.log('Transformed items:', JSON.stringify(items, null, 2));
    
    // Create record
    const recordId = 'routine-' + Date.now();
    const now = new Date().toISOString();
    
    console.log('\nCreating record...');
    db.prepare('INSERT INTO routine_records (id, user_id, department_id, template_id, date, completed_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(recordId, se7en.id, se7en.department, template.id, today, JSON.stringify(items), now);
    
    console.log('Record created:', recordId);
    
    // Verify
    const newRecord = db.prepare('SELECT * FROM routine_records WHERE id = ?').get(recordId);
    console.log('\nVerification:');
    console.log('completed_items:', newRecord.completed_items);
    
    const parsed = JSON.parse(newRecord.completed_items);
    console.log('Parsed:', JSON.stringify(parsed, null, 2));
    console.log('Items count:', parsed.length);
    console.log('First item has text property:', !!parsed[0].text);
    console.log('First item has completed property:', typeof parsed[0].completed === 'boolean');
  }
}

db.close();
console.log('\n=== Test complete ===');
