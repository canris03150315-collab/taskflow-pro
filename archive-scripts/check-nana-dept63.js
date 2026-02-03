const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking NANA schedule in DEPT_63...\n');

const nana = db.prepare("SELECT id, name, department, role FROM users WHERE name = 'NANA'").get();
console.log('NANA:', JSON.stringify(nana));

if (nana) {
  const schedules = db.prepare("SELECT year, month, total_days, status, department_id FROM schedules WHERE user_id = ? ORDER BY year DESC, month DESC").all(nana.id);
  console.log('NANA schedules:', JSON.stringify(schedules, null, 2));
  
  const jan2026 = db.prepare("SELECT * FROM schedules WHERE user_id = ? AND year = 2026 AND month = 1").get(nana.id);
  console.log('NANA Jan 2026:', JSON.stringify(jan2026, null, 2));
}

const dept63Jan = db.prepare("SELECT s.*, u.name FROM schedules s JOIN users u ON s.user_id = u.id WHERE s.department_id = 'DEPT_63' AND s.year = 2026 AND s.month = 1").all();
console.log('\nDEPT_63 Jan 2026 count:', dept63Jan.length);
console.log('DEPT_63 users with schedules:', dept63Jan.map(s => s.name));

db.close();
