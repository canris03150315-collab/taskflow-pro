const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== 診斷翔哥假表問題 ===\n');

// 1. 找到翔哥的用戶資料
console.log('1. 查找翔哥用戶資料:');
const users = db.prepare("SELECT id, name, role, department_id FROM users WHERE name LIKE '%翔%'").all();
console.log(users);

if (users.length === 0) {
  console.log('找不到翔哥，列出所有用戶:');
  const allUsers = db.prepare("SELECT id, name, role, department_id FROM users").all();
  allUsers.forEach(u => console.log(`  - ${u.name} (${u.role})`));
}

// 2. 查看假表結構
console.log('\n2. leave_requests 表結構:');
const tableInfo = db.prepare("PRAGMA table_info(leave_requests)").all();
tableInfo.forEach(col => console.log(`  - ${col.name}: ${col.type}`));

// 3. 如果找到翔哥，查看他的假表資料
if (users.length > 0) {
  const userId = users[0].id;
  console.log(`\n3. 翔哥的假表資料 (user_id: ${userId}):`);
  const leaves = db.prepare("SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 10").all(userId);
  console.log(`   共 ${leaves.length} 筆請假記錄`);
  leaves.forEach(l => {
    console.log(`   - ID: ${l.id}`);
    console.log(`     類型: ${l.leave_type}, 狀態: ${l.status}`);
    console.log(`     開始: ${l.start_date}, 結束: ${l.end_date}`);
    console.log(`     原因: ${l.reason}`);
    console.log('');
  });
}

// 4. 檢查假表相關的其他資料
console.log('\n4. 所有假表記錄統計:');
const stats = db.prepare("SELECT status, COUNT(*) as count FROM leave_requests GROUP BY status").all();
stats.forEach(s => console.log(`   - ${s.status}: ${s.count} 筆`));

// 5. 最近的假表記錄
console.log('\n5. 最近 5 筆假表記錄:');
const recentLeaves = db.prepare(`
  SELECT lr.*, u.name as user_name 
  FROM leave_requests lr 
  JOIN users u ON lr.user_id = u.id 
  ORDER BY lr.created_at DESC 
  LIMIT 5
`).all();
recentLeaves.forEach(l => {
  console.log(`   - ${l.user_name}: ${l.leave_type} (${l.status})`);
  console.log(`     ${l.start_date} ~ ${l.end_date}`);
});

db.close();
console.log('\n=== 診斷完成 ===');
