const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Finding NANA approved schedule...\n');

const nana = db.prepare('SELECT id, name, department FROM users WHERE name = ?').get('NANA');
console.log('NANA:', nana);

if (nana) {
  const all = db.prepare('SELECT id, status, selected_days, submitted_at FROM schedules WHERE user_id = ? AND year = 2026 AND month = 1 ORDER BY submitted_at DESC').all(nana.id);
  
  console.log('\nTotal January 2026 schedules:', all.length);
  all.forEach((s, i) => {
    console.log(`\n${i+1}. ID: ${s.id}`);
    console.log('   Status:', s.status);
    console.log('   Days:', s.selected_days);
    console.log('   Submitted:', s.submitted_at);
  });
  
  const approved = all.find(s => s.status === 'APPROVED');
  if (approved) {
    console.log('\n*** FOUND APPROVED SCHEDULE ***');
    console.log('ID:', approved.id);
    console.log('Days:', approved.selected_days);
  } else {
    console.log('\n*** NO APPROVED SCHEDULE FOUND ***');
  }
}

db.close();
