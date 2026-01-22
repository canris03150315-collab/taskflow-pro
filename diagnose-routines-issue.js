const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnosing daily task issues ===\n');

// 1. Check all routine templates
const templates = db.prepare('SELECT * FROM routine_templates ORDER BY last_updated DESC').all();
console.log('1. All routine templates:', templates.length);
templates.forEach(t => {
  console.log(`  - ID: ${t.id}, Dept: ${t.department_id}, Title: ${t.title}, IsDaily: ${t.is_daily}`);
});

// 2. Check today's records
const today = new Date().toISOString().split('T')[0];
const records = db.prepare('SELECT * FROM routine_records WHERE date = ?').all(today);
console.log(`\n2. Today's routine records (${today}):`, records.length);
records.forEach(r => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
  console.log(`  - User: ${user?.name}, Dept: ${r.department_id}, Items: ${r.items}`);
});

// 3. Check 63 department users
const dept63Users = db.prepare("SELECT id, name, department FROM users WHERE department = 'j06ng7vy3'").all();
console.log('\n3. Department 63 (j06ng7vy3) users:', dept63Users.length);
dept63Users.forEach(u => {
  const todayRecord = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?').get(u.id, today);
  console.log(`  - ${u.name}: Has record? ${todayRecord ? 'YES' : 'NO'}`);
  if (todayRecord) {
    console.log(`    Items: ${todayRecord.items}`);
  }
});

// 4. Check if there are any deleted templates still referenced
console.log('\n4. Checking for orphaned records...');
records.forEach(r => {
  const template = templates.find(t => t.department_id === r.department_id && t.is_daily === 1);
  if (!template) {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
    console.log(`  ⚠️  Record for ${user?.name} references deleted template (dept: ${r.department_id})`);
  }
});

db.close();
