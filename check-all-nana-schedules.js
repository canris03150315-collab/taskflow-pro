const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking ALL NANA schedules ===\n');

const nana = db.prepare('SELECT id, name, department FROM users WHERE name = ?').get('NANA');
console.log('NANA user:', nana);
console.log('');

if (nana) {
  // Get ALL schedules for NANA in 2026
  const schedules = db.prepare(`
    SELECT id, year, month, selected_days, status, submitted_at, approved_at, rejected_at
    FROM schedules 
    WHERE user_id = ? AND year = 2026
    ORDER BY month ASC
  `).all(nana.id);
  
  console.log('Total schedules for NANA in 2026:', schedules.length);
  console.log('');
  
  schedules.forEach((s, idx) => {
    console.log(`Schedule ${idx + 1}:`);
    console.log('  ID:', s.id);
    console.log('  Month:', s.month);
    console.log('  Status:', s.status);
    console.log('  Selected days:', s.selected_days);
    console.log('  Submitted at:', s.submitted_at);
    console.log('  Approved at:', s.approved_at);
    console.log('  Rejected at:', s.rejected_at);
    console.log('');
  });
  
  // Check January specifically
  const jan = db.prepare(`
    SELECT * FROM schedules 
    WHERE user_id = ? AND year = 2026 AND month = 1
    ORDER BY submitted_at DESC
  `).all(nana.id);
  
  console.log('January 2026 schedules count:', jan.length);
  if (jan.length > 1) {
    console.log('WARNING: Multiple January schedules found!');
  }
}

db.close();
