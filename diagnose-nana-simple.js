const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const nana = db.prepare('SELECT id, name, department FROM users WHERE name = ?').get('NANA');
console.log('NANA:', nana);

if (nana) {
  const schedule = db.prepare('SELECT department_id, status, selected_days FROM schedules WHERE user_id = ? AND year = 2026 AND month = 1').get(nana.id);
  console.log('Schedule:', schedule);
  
  if (schedule) {
    console.log('Department match:', nana.department === schedule.department_id);
  }
}

db.close();
