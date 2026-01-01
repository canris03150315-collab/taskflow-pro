// 使用 SecureDatabase 清理打卡記錄
const { SecureDatabase } = require('../database-v2');
const path = require('path');

async function clearAttendance() {
  const dbPath = path.join('/app/data', 'taskflow.db');
  const db = new SecureDatabase(dbPath);
  
  try {
    await db.initialize();
    
    // 查看當前記錄數
    const countBefore = await db.get('SELECT COUNT(*) as count FROM attendance_records');
    console.log('Records before delete:', countBefore.count);
    
    // 刪除所有打卡記錄
    await db.run('DELETE FROM attendance_records');
    console.log('Delete command executed');
    
    // 確認刪除
    const countAfter = await db.get('SELECT COUNT(*) as count FROM attendance_records');
    console.log('Records after delete:', countAfter.count);
    
    await db.close();
    console.log('✅ 清理完成');
  } catch (error) {
    console.error('❌ 清理失敗:', error);
    process.exit(1);
  }
}

clearAttendance();
