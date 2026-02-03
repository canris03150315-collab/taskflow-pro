const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Testing schedules API logic ===\n');

// Simulate BOSS user
const boss = { role: 'BOSS', department: 'Management' };

// Get all schedules (BOSS should see all)
const allSchedules = db.prepare('SELECT s.id, s.year, s.month, s.status, s.department_id, u.name FROM schedules s JOIN users u ON s.user_id = u.id WHERE s.year = 2026 AND s.month = 1 ORDER BY s.submitted_at DESC').all();

console.log('Total January 2026 schedules:', allSchedules.length);
console.log('\nAll schedules:');
allSchedules.forEach(s => {
  console.log(`  ${s.name} (${s.department_id}): ${s.status}`);
});

// Check NANA specifically
const nanaSchedules = allSchedules.filter(s => s.name === 'NANA');
console.log('\nNANA schedules:', nanaSchedules.length);
nanaSchedules.forEach(s => {
  console.log(`  ID: ${s.id}`);
  console.log(`  Status: ${s.status}`);
  console.log(`  Department: ${s.department_id}`);
});

// Check DEPT_63 (j06ng7vy3) schedules
const dept63Schedules = allSchedules.filter(s => s.department_id === 'j06ng7vy3');
console.log('\nDEPT_63 (j06ng7vy3) schedules:', dept63Schedules.length);
dept63Schedules.forEach(s => {
  console.log(`  ${s.name}: ${s.status}`);
});

db.close();
