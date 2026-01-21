const Database = require('better-sqlite3');

console.log('=== Testing Work Logs API Logic ===\n');

// Simulate the API logic
const db = new Database('/app/data/taskflow.db');

// Get a sample user
const user = db.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get('BOSS');
console.log('Test User:', user.name, 'Role:', user.role);

// Test the query
const query = `
  SELECT 
    wl.*,
    u.name as user_name,
    d.name as department_name
  FROM work_logs wl
  LEFT JOIN users u ON wl.user_id = u.id
  LEFT JOIN departments d ON wl.department_id = d.id
  WHERE 1=1
  ORDER BY wl.date DESC, wl.created_at DESC
  LIMIT 3
`;

console.log('\nExecuting query...');
const logs = db.prepare(query).all();

console.log('\nQuery returned', logs.length, 'records');

if (logs.length > 0) {
  console.log('\nFirst record (raw):');
  console.log(JSON.stringify(logs[0], null, 2));
  
  console.log('\nFirst record (mapped to camelCase):');
  const mapped = {
    id: logs[0].id,
    userId: logs[0].user_id,
    userName: logs[0].user_name,
    departmentId: logs[0].department_id,
    departmentName: logs[0].department_name,
    date: logs[0].date,
    todayTasks: logs[0].today_tasks,
    tomorrowTasks: logs[0].tomorrow_tasks,
    notes: logs[0].notes || '',
    createdAt: logs[0].created_at,
    updatedAt: logs[0].updated_at
  };
  console.log(JSON.stringify(mapped, null, 2));
}

db.close();
console.log('\nDONE');
