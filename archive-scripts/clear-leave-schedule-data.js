const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('開始清理排班和請假測試數據...');

try {
  // 清除排班數據
  const schedulesResult = db.prepare('DELETE FROM schedules').run();
  console.log(`✅ 已清除 ${schedulesResult.changes} 筆排班記錄`);
  
  // 清除請假數據
  const leavesResult = db.prepare('DELETE FROM leaves').run();
  console.log(`✅ 已清除 ${leavesResult.changes} 筆請假記錄`);
  
  // 驗證清理結果
  const schedulesCount = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
  const leavesCount = db.prepare('SELECT COUNT(*) as count FROM leaves').get();
  
  console.log('\n清理結果驗證:');
  console.log(`- 排班記錄剩餘: ${schedulesCount.count} 筆`);
  console.log(`- 請假記錄剩餘: ${leavesCount.count} 筆`);
  
  if (schedulesCount.count === 0 && leavesCount.count === 0) {
    console.log('\n✅ 測試數據清理完成！');
  } else {
    console.log('\n⚠️ 警告：仍有數據未清除');
  }
  
} catch (error) {
  console.error('❌ 清理失敗:', error.message);
  process.exit(1);
}

db.close();
console.log('\n數據庫連接已關閉');
