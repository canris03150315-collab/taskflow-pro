const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'taskflow.db');
const db = new sqlite3.Database(dbPath);

console.log('檢查假表資料...\n');

db.get('SELECT COUNT(*) as count FROM leave_requests', (err, row) => {
  if (err) {
    console.error('查詢失敗:', err);
  } else {
    console.log(`請假記錄數量: ${row.count}`);
  }
  
  db.get('SELECT COUNT(*) as count FROM schedules', (err, row) => {
    if (err) {
      console.error('查詢失敗:', err);
    } else {
      console.log(`排班記錄數量: ${row.count}`);
    }
    db.close();
  });
});
