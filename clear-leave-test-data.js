const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('開始清理假表測試資料...');

const dbPath = path.join(__dirname, 'data', 'taskflow.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 1. 清理請假記錄
  db.run('DELETE FROM leave_requests', function(err) {
    if (err) {
      console.error('清理請假記錄失敗:', err);
    } else {
      console.log(`✅ 已清理 ${this.changes} 筆請假記錄`);
    }
  });

  // 2. 清理排班記錄
  db.run('DELETE FROM schedules', function(err) {
    if (err) {
      console.error('清理排班記錄失敗:', err);
    } else {
      console.log(`✅ 已清理 ${this.changes} 筆排班記錄`);
    }
  });

  // 3. 驗證清理結果
  db.get('SELECT COUNT(*) as count FROM leave_requests', (err, row) => {
    if (err) {
      console.error('驗證請假記錄失敗:', err);
    } else {
      console.log(`📊 剩餘請假記錄: ${row.count} 筆`);
    }
  });

  db.get('SELECT COUNT(*) as count FROM schedules', (err, row) => {
    if (err) {
      console.error('驗證排班記錄失敗:', err);
    } else {
      console.log(`📊 剩餘排班記錄: ${row.count} 筆`);
    }
    
    // 關閉資料庫連接
    db.close((err) => {
      if (err) {
        console.error('關閉資料庫失敗:', err);
      } else {
        console.log('✅ 假表測試資料清理完成！');
      }
    });
  });
});
