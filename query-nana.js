const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const nana = db.prepare("SELECT id, name, department FROM users WHERE name LIKE '%NANA%'").get();
console.log('NANA:', nana);

if (nana) {
  const schedules = db.prepare("SELECT * FROM schedules WHERE user_id = ?").all(nana.id);
  console.log('NANA schedules count:', schedules.length);
  schedules.forEach(s => console.log('Schedule:', s));
}

const dept63Schedules = db.prepare("SELECT s.*, u.name FROM schedules s JOIN users u ON s.user_id = u.id WHERE u.department = 'DEPT_63' AND s.year = 2026 AND s.month = 1").all();
console.log('DEPT_63 Jan 2026 schedules:', dept63Schedules.length);
dept63Schedules.forEach(s => console.log('DEPT_63 Schedule:', s));

db.close();
