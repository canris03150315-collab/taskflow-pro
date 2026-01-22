const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking NANA schedule data ===\n');

const nana = db.prepare("SELECT id, name, department FROM users WHERE name = 'NANA'").get();
console.log('1. NANA user:', JSON.stringify(nana));

if (nana) {
  const schedule = db.prepare("SELECT * FROM schedules WHERE user_id = ? AND year = 2026 AND month = 1").get(nana.id);
  console.log('\n2. NANA Jan 2026 schedule:');
  console.log(JSON.stringify(schedule, null, 2));
  
  if (schedule) {
    console.log('\n3. Key fields:');
    console.log('   department_id:', schedule.department_id);
    console.log('   status:', schedule.status);
    console.log('   selected_days:', schedule.selected_days);
  }
}

const dept63All = db.prepare("SELECT s.user_id, u.name, s.status, s.department_id FROM schedules s JOIN users u ON s.user_id = u.id WHERE s.department_id = 'DEPT_63' AND s.year = 2026 AND s.month = 1").all();
console.log('\n4. All DEPT_63 Jan 2026 schedules:', dept63All.length);
dept63All.forEach(s => console.log('   -', s.name, 'status:', s.status));

db.close();
