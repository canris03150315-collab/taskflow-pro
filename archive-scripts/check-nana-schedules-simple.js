const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking NANA schedules ===\n');

const nana = db.prepare('SELECT id, name, department FROM users WHERE name = ?').get('NANA');
console.log('NANA:', nana);

if (nana) {
  // Get schema
  const schema = db.prepare("PRAGMA table_info(schedules)").all();
  console.log('\nSchedules table columns:');
  schema.forEach(col => console.log('  -', col.name));
  
  // Get ALL January 2026 schedules for NANA
  const jan = db.prepare('SELECT * FROM schedules WHERE user_id = ? AND year = 2026 AND month = 1').all(nana.id);
  console.log('\nJanuary 2026 schedules for NANA:', jan.length);
  
  jan.forEach((s, idx) => {
    console.log(`\nSchedule ${idx + 1}:`);
    console.log('  ID:', s.id);
    console.log('  Status:', s.status);
    console.log('  Selected days:', s.selected_days);
    console.log('  Total days:', s.total_days);
    console.log('  Submitted at:', s.submitted_at);
    console.log('  Updated at:', s.updated_at);
    if (s.approved_by) console.log('  Approved by:', s.approved_by);
    if (s.rejected_by) console.log('  Rejected by:', s.rejected_by);
  });
}

db.close();
