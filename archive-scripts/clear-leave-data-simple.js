const fs = require('fs');
const path = require('path');

console.log('清理假表測試資料...\n');

// 讀取 index.js 找到資料庫連接方式
const indexPath = '/app/dist/index.js';
let indexContent = fs.readFileSync(indexPath, 'utf8');

// 創建清理腳本
const cleanScript = `
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'taskflow.db');
const db = new Database(dbPath);

console.log('開始清理假表測試資料...\\n');

try {
  // 清理請假記錄
  const deleteLeaves = db.prepare('DELETE FROM leave_requests');
  const leavesResult = deleteLeaves.run();
  console.log('✅ 已清理 ' + leavesResult.changes + ' 筆請假記錄');

  // 清理排班記錄
  const deleteSchedules = db.prepare('DELETE FROM schedules');
  const schedulesResult = deleteSchedules.run();
  console.log('✅ 已清理 ' + schedulesResult.changes + ' 筆排班記錄');

  // 驗證清理結果
  const countLeaves = db.prepare('SELECT COUNT(*) as count FROM leave_requests').get();
  console.log('📊 剩餘請假記錄: ' + countLeaves.count + ' 筆');

  const countSchedules = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
  console.log('📊 剩餘排班記錄: ' + countSchedules.count + ' 筆');

  console.log('\\n✅ 假表測試資料清理完成！');
} catch (error) {
  console.error('❌ 清理失敗:', error.message);
} finally {
  db.close();
}
`;

fs.writeFileSync('/app/do-clean-leaves.js', cleanScript, 'utf8');
console.log('✅ 清理腳本已創建');
