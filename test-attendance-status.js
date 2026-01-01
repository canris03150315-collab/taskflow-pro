const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 測試打卡狀態邏輯 ===\n');

// 獲取當前日期（UTC）
const today = new Date().toISOString().split('T')[0];
console.log('今天日期 (UTC):', today);
console.log('當前時間 (UTC):', new Date().toISOString());
console.log('當前時間 (本地):', new Date().toString());
console.log('');

// 查詢所有用戶
const users = db.prepare('SELECT id, name FROM users').all();
console.log(`找到 ${users.length} 個用戶\n`);

users.forEach(user => {
  console.log(`--- 用戶: ${user.name} (${user.id}) ---`);
  
  // 查找今天的打卡記錄
  const todayRecords = db.prepare(`
    SELECT id, date, 
           datetime(clock_in) as clock_in, 
           datetime(clock_out) as clock_out, 
           status,
           datetime(created_at) as created_at
    FROM attendance_records 
    WHERE user_id = ? AND date = ? 
    ORDER BY created_at ASC
  `).all(user.id, today);
  
  console.log(`今天的打卡記錄: ${todayRecords.length} 筆`);
  
  if (todayRecords.length > 0) {
    todayRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. 上班: ${record.clock_in || '未打卡'}, 下班: ${record.clock_out || '未打卡'}, 狀態: ${record.status}`);
    });
    
    const lastRecord = todayRecords[todayRecords.length - 1];
    console.log(`\n  最後一筆記錄:`);
    console.log(`    ID: ${lastRecord.id}`);
    console.log(`    上班: ${lastRecord.clock_in}`);
    console.log(`    下班: ${lastRecord.clock_out || '未打卡'}`);
    console.log(`    狀態: ${lastRecord.status}`);
    
    // 計算應該顯示的狀態
    let displayStatus = 'ABSENT';
    let canClockIn = true;
    let canClockOut = false;
    
    if (lastRecord.clock_in && !lastRecord.clock_out) {
      displayStatus = 'ONLINE';
      canClockIn = false;
      canClockOut = true;
    } else if (lastRecord.clock_out) {
      displayStatus = 'OFFLINE';
      canClockIn = true;
      canClockOut = false;
    }
    
    console.log(`\n  應該顯示的狀態:`);
    console.log(`    狀態: ${displayStatus}`);
    console.log(`    可以上班打卡: ${canClockIn}`);
    console.log(`    可以下班打卡: ${canClockOut}`);
  } else {
    console.log('  今天還沒有打卡記錄');
  }
  console.log('');
});

// 檢查所有日期的記錄
console.log('=== 所有打卡記錄（最近10筆）===');
const allRecords = db.prepare(`
  SELECT u.name, a.date, 
         datetime(a.clock_in) as clock_in, 
         datetime(a.clock_out) as clock_out, 
         a.status
  FROM attendance_records a
  LEFT JOIN users u ON a.user_id = u.id
  ORDER BY a.created_at DESC
  LIMIT 10
`).all();

allRecords.forEach((record, index) => {
  console.log(`${index + 1}. ${record.name} - ${record.date} - 上班:${record.clock_in || '無'} 下班:${record.clock_out || '無'} (${record.status})`);
});

db.close();
