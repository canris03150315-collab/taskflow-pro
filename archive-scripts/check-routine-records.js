const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/app/data/taskflow.db');

console.log('=== 檢查今日的 routine_records ===');
db.all(`SELECT id, user_id, department_id, date, created_at FROM routine_records WHERE date = date('now') ORDER BY created_at DESC`, [], (err, rows) => {
  if (err) {
    console.error('錯誤:', err);
  } else {
    console.log('今日記錄數量:', rows.length);
    rows.forEach(row => {
      console.log(JSON.stringify(row));
    });
  }
  
  console.log('\n=== 檢查 Se7en 用戶資訊 ===');
  db.all(`SELECT id, name, department FROM users WHERE name LIKE '%Se7en%'`, [], (err2, users) => {
    if (err2) {
      console.error('錯誤:', err2);
    } else {
      users.forEach(user => {
        console.log(JSON.stringify(user));
      });
    }
    db.close();
  });
});
