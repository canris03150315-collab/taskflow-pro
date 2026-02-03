const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking Orphaned Routine Records ===\n');

// Get all templates
const templates = db.prepare('SELECT * FROM routine_templates').all();
console.log('Current templates:', templates.length);
templates.forEach(t => {
  console.log(`  ${t.id}: ${t.title} (Dept: ${t.department_id}, Daily: ${t.is_daily})`);
});

// Get recent records (last 7 days)
const recentRecords = db.prepare(`
  SELECT * FROM routine_records 
  WHERE date >= date('now', '-7 days')
  ORDER BY date DESC
`).all();

console.log('\nRecent records (last 7 days):', recentRecords.length);

// Check for orphaned records
const orphaned = [];
recentRecords.forEach(r => {
  const user = db.prepare('SELECT name, department FROM users WHERE id = ?').get(r.user_id);
  const template = templates.find(t => t.department_id === r.department_id && t.is_daily === 1);
  
  if (!template) {
    orphaned.push({
      userId: r.user_id,
      userName: user?.name,
      userDept: user?.department,
      recordDept: r.department_id,
      date: r.date
    });
  }
});

if (orphaned.length > 0) {
  console.log('\n⚠️  Found orphaned records:', orphaned.length);
  orphaned.forEach(o => {
    console.log(`  - ${o.userName} (user dept: ${o.userDept}) has record for dept: ${o.recordDept} on ${o.date}`);
  });
} else {
  console.log('\n✅ No orphaned records found');
}

// Check today specifically
const today = new Date().toISOString().split('T')[0];
const todayRecords = db.prepare('SELECT * FROM routine_records WHERE date = ?').all(today);
console.log(`\nToday's records (${today}):`, todayRecords.length);
todayRecords.forEach(r => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
  console.log(`  - ${user?.name}: dept ${r.department_id}`);
});

db.close();
