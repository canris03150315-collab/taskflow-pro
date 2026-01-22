const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnosing NANA schedule visibility ===\n');

// 1. Find NANA
const nana = db.prepare("SELECT id, name, department, role FROM users WHERE name = 'NANA'").get();
if (!nana) {
  console.log('ERROR: NANA not found');
  db.close();
  process.exit(1);
}
console.log('1. NANA info:', nana);

// 2. Check NANA's schedules
const nanaSchedules = db.prepare(`
  SELECT id, year, month, total_days, status, submitted_at 
  FROM schedules 
  WHERE user_id = ? 
  ORDER BY year DESC, month DESC
`).all(nana.id);
console.log('\n2. NANA schedules:', nanaSchedules);

// 3. Check January 2026 specifically
const jan2026 = db.prepare(`
  SELECT * FROM schedules 
  WHERE user_id = ? AND year = 2026 AND month = 1
`).get(nana.id);
console.log('\n3. NANA January 2026:', jan2026);

// 4. Check all DEPT_63 schedules for January 2026
const dept63Jan = db.prepare(`
  SELECT s.id, s.year, s.month, s.total_days, s.status, u.name 
  FROM schedules s 
  JOIN users u ON s.user_id = u.id 
  WHERE s.department_id = 'DEPT_63' AND s.year = 2026 AND s.month = 1
`).all();
console.log('\n4. All DEPT_63 January 2026 schedules:', dept63Jan);

// 5. Analysis
console.log('\n=== ANALYSIS ===');
console.log('NANA department:', nana.department);
console.log('Is NANA in DEPT_63?', nana.department === 'DEPT_63' ? 'YES' : 'NO');
console.log('NANA has Jan 2026 schedule?', jan2026 ? 'YES' : 'NO');
if (jan2026) {
  console.log('Schedule status:', jan2026.status);
  console.log('Schedule department_id:', jan2026.department_id);
}

db.close();
