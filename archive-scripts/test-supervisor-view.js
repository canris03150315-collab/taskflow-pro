const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Test Supervisor View for x3ye5179b Department ===\n');

// Get supervisor for this department
const supervisor = db.prepare(`
  SELECT id, name, role, department 
  FROM users 
  WHERE department = 'x3ye5179b' AND role = 'SUPERVISOR'
  LIMIT 1
`).get();

console.log('Supervisor:', supervisor);

// Simulate API call with supervisor role
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const startDate = thirtyDaysAgo.toISOString().split('T')[0];

// Query as SUPERVISOR (should see all department records)
const records = db.prepare(
  'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC'
).all(supervisor.department, startDate);

console.log(`\nTotal records returned: ${records.length}\n`);

// Group by date
const byDate = {};
records.forEach(r => {
  if (!byDate[r.date]) byDate[r.date] = [];
  byDate[r.date].push(r);
});

console.log('Records by date:');
Object.keys(byDate).sort().reverse().slice(0, 5).forEach(date => {
  const dateRecords = byDate[date];
  console.log(`\n${date} (${dateRecords.length} records):`);
  dateRecords.forEach(r => {
    const items = JSON.parse(r.completed_items || '[]');
    const completed = items.filter(item => item.completed).length;
    const total = items.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Get user name
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
    
    console.log(`  - ${user ? user.name : r.user_id}: ${completed}/${total} (${percent}%)`);
  });
});

// API response format
const apiResponse = {
  records: records.map(r => ({
    id: r.id,
    user_id: r.user_id,
    department_id: r.department_id,
    date: r.date,
    items: JSON.parse(r.completed_items || '[]')
  }))
};

console.log(`\nAPI would return ${apiResponse.records.length} records`);
console.log('Sample (first 2):');
console.log(JSON.stringify(apiResponse.records.slice(0, 2), null, 2));

db.close();
