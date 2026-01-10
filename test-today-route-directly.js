const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Simulate /today route logic ===');

function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error('Method ' + method + ' not found');
}

const se7en = db.prepare('SELECT id, department FROM users WHERE username = ?').get('code001');
const userId = se7en.id;
const userDept = se7en.department;
const today = new Date().toISOString().split('T')[0];

console.log('User:', userId);
console.log('Dept:', userDept);
console.log('Today:', today);

// Check for existing record
let existing = dbCall(db, 'get', 
  'SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?',
  [userId, today, userDept]
);

console.log('\nExisting record:', existing ? 'Found' : 'Not found');

if (!existing) {
  console.log('\nNo record, will create new one...');
  
  const templates = dbCall(db, 'all',
    'SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1',
    [userDept]
  );
  
  console.log('Templates found:', templates.length);
  
  if (templates.length > 0) {
    const template = templates[0];
    console.log('Using template:', template.title);
    console.log('Template items (raw):', template.items);
    
    const templateItems = JSON.parse(template.items || '[]');
    console.log('Template items (parsed):', templateItems);
    
    const items = templateItems.map(text => ({ text, completed: false }));
    console.log('Items to save:', JSON.stringify(items, null, 2));
    
    const recordId = 'routine-test-' + Date.now();
    const now = new Date().toISOString();
    
    dbCall(db, 'run',
      'INSERT INTO routine_records (id, user_id, department_id, template_id, date, completed_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [recordId, userId, userDept, template.id, today, JSON.stringify(items), now]
    );
    
    console.log('\nRecord created:', recordId);
    
    // Verify
    const verify = dbCall(db, 'get', 'SELECT * FROM routine_records WHERE id = ?', [recordId]);
    console.log('Verification - completed_items:', verify.completed_items);
    
    const parsed = JSON.parse(verify.completed_items);
    console.log('Parsed:', JSON.stringify(parsed, null, 2));
  }
}

db.close();
console.log('\n=== Test complete ===');
