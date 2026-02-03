const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Comparing routines.js versions ===\n');

// Check current file size
const currentFile = '/app/dist/routes/routines.js';
const stats = fs.statSync(currentFile);
console.log('Current routines.js size:', stats.size, 'bytes\n');

// Check database state
console.log('=== Database State ===');
const templates = db.prepare('SELECT * FROM routine_templates').all();
console.log('Total templates:', templates.length);
templates.forEach(t => {
  console.log(`  ${t.id}: ${t.title} (Dept: ${t.department_id}, Daily: ${t.is_daily})`);
});

const today = new Date().toISOString().split('T')[0];
const records = db.prepare('SELECT * FROM routine_records WHERE date = ?').all(today);
console.log('\nToday records:', records.length);

// Check for orphaned records
console.log('\n=== Checking Orphaned Records ===');
const allRecords = db.prepare('SELECT * FROM routine_records WHERE date >= date("now", "-7 days")').all();
allRecords.forEach(r => {
  const user = db.prepare('SELECT name, department FROM users WHERE id = ?').get(r.user_id);
  const template = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1').get(r.department_id);
  
  if (!template) {
    console.log(`⚠️ Orphaned: ${user?.name} (${user?.department}) - Record dept: ${r.department_id}, Date: ${r.date}`);
  }
});

db.close();
