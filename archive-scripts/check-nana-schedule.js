const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking NANA schedule visibility issue ===\n');

// 1. Find NANA
const nana = db.prepare("SELECT id, name, department, role FROM users WHERE name LIKE '%NANA%'").get();
console.log('1. NANA User Info:');
console.log(JSON.stringify(nana, null, 2));

if (!nana) {
  console.log('ERROR: NANA user not found!');
  db.close();
  process.exit(1);
}

// 2. Check DEPT_63
const dept63 = db.prepare("SELECT id, name FROM departments WHERE id = 'DEPT_63'").get();
console.log('\n2. DEPT_63 Info:');
console.log(JSON.stringify(dept63, null, 2));

// 3. Get all users in DEPT_63
const dept63Users = db.prepare("SELECT id, name, role FROM users WHERE department = 'DEPT_63'").all();
console.log('\n3. All users in DEPT_63:');
console.log(JSON.stringify(dept63Users, null, 2));

// 4. Check NANA's schedules
const nanaSchedules = db.prepare(`
  SELECT * FROM schedules 
  WHERE user_id = ? 
  ORDER BY year DESC, month DESC 
  LIMIT 5
`).all(nana.id);
console.log('\n4. NANA\'s schedules (last 5):');
console.log(JSON.stringify(nanaSchedules, null, 2));

// 5. Check January 2026 schedules for DEPT_63
const jan2026Schedules = db.prepare(`
  SELECT s.*, u.name, u.department 
  FROM schedules s
  JOIN users u ON s.user_id = u.id
  WHERE u.department = 'DEPT_63' 
  AND s.year = 2026 
  AND s.month = 1
`).all();
console.log('\n5. January 2026 schedules for DEPT_63:');
console.log(JSON.stringify(jan2026Schedules, null, 2));

// 6. Check if NANA is in DEPT_63
console.log('\n6. Analysis:');
console.log(`NANA department: ${nana.department}`);
console.log(`Is NANA in DEPT_63? ${nana.department === 'DEPT_63' ? 'YES' : 'NO'}`);
console.log(`NANA has ${nanaSchedules.length} schedules`);
console.log(`DEPT_63 has ${jan2026Schedules.length} schedules in Jan 2026`);

db.close();
