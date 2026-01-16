const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Simulate Frontend API Call Flow ===\n');

// Simulate SUPERVISOR login (like 阿德)
const supervisor = db.prepare(`
  SELECT id, name, role, department 
  FROM users 
  WHERE department = 'x3ye5179b' AND role = 'SUPERVISOR'
  LIMIT 1
`).get();

console.log('1. User Login:', supervisor.name, `(${supervisor.role})`);

// Simulate API call: GET /api/routines/history
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const startDate = thirtyDaysAgo.toISOString().split('T')[0];

console.log('2. API Query: /api/routines/history');
console.log('   Start date:', startDate);
console.log('   User role:', supervisor.role);
console.log('   User dept:', supervisor.department);

// Backend logic based on role
let records;
if (supervisor.role === 'SUPERVISOR') {
  records = db.prepare(
    'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC'
  ).all(supervisor.department, startDate);
} else if (supervisor.role === 'BOSS' || supervisor.role === 'MANAGER') {
  records = db.prepare(
    'SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC'
  ).all(startDate);
} else {
  records = db.prepare(
    'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
  ).all(supervisor.id, supervisor.department, startDate);
}

const apiResponse = {
  records: records.map(r => ({
    id: r.id,
    user_id: r.user_id,
    department_id: r.department_id,
    date: r.date,
    items: JSON.parse(r.completed_items || '[]')
  }))
};

console.log('3. API Response: returns', apiResponse.records.length, 'records');

// Simulate frontend filtering (SubordinateRoutineView.tsx line 61)
const today = new Date().toISOString().split('T')[0];
const selectedDate = today; // Frontend default
console.log('\n4. Frontend Filter:');
console.log('   Selected date:', selectedDate);

const filteredRecords = apiResponse.records.filter(r => r.date === selectedDate);
console.log('   Filtered records:', filteredRecords.length);

if (filteredRecords.length > 0) {
  console.log('\n5. Frontend Should Display:');
  filteredRecords.forEach((rec, idx) => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(rec.user_id);
    const completed = rec.items.filter(item => item.completed).length;
    const total = rec.items.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    console.log(`   ${idx + 1}. ${user ? user.name : 'Unknown'}: ${completed}/${total} (${percent}%)`);
    console.log(`      Items:`, rec.items.map(i => `${i.completed ? '[X]' : '[ ]'} ${i.text}`).join(', '));
  });
} else {
  console.log('\n5. Frontend Display: "今日尚未開始每日任務" (No records for today)');
}

console.log('\n6. Full API Response Structure:');
console.log(JSON.stringify(apiResponse, null, 2).substring(0, 1000) + '...');

db.close();
