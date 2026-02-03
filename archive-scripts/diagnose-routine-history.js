const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 診斷每日任務歷史記錄 ===\n');

// 1. 檢查 routine_records 表結構
console.log('1. 表結構：');
const tableInfo = db.prepare("PRAGMA table_info(routine_records)").all();
console.log('欄位:', tableInfo.map(c => c.name).join(', '));
console.log('');

// 2. 統計總記錄數
const totalCount = db.prepare("SELECT COUNT(*) as count FROM routine_records").get();
console.log(`2. 總記錄數: ${totalCount.count}`);
console.log('');

// 3. 檢查最近 7 天的記錄
console.log('3. 最近 7 天的記錄：');
const recentRecords = db.prepare(`
  SELECT date, COUNT(*) as count, 
         GROUP_CONCAT(DISTINCT user_id) as user_ids
  FROM routine_records 
  WHERE date >= date('now', '-7 days')
  GROUP BY date 
  ORDER BY date DESC
`).all();

recentRecords.forEach(r => {
  console.log(`  日期: ${r.date}, 記錄數: ${r.count}, 用戶數: ${r.user_ids ? r.user_ids.split(',').length : 0}`);
});
console.log('');

// 4. 檢查前兩天有完成任務的記錄
const twoDaysAgo = new Date();
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

const oneDayAgo = new Date();
oneDayAgo.setDate(oneDayAgo.getDate() - 1);
const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0];

console.log(`4. 檢查前兩天 (${twoDaysAgoStr} 和 ${oneDayAgoStr}) 的完成記錄：`);

[twoDaysAgoStr, oneDayAgoStr].forEach(dateStr => {
  const records = db.prepare(`
    SELECT id, user_id, date, items
    FROM routine_records 
    WHERE date = ?
  `).all(dateStr);
  
  console.log(`\n  === ${dateStr} ===`);
  console.log(`  記錄數: ${records.length}`);
  
  records.forEach(r => {
    let items = [];
    try {
      items = JSON.parse(r.items);
    } catch (e) {
      console.log(`  ⚠️ 用戶 ${r.user_id}: 無法解析 items`);
      return;
    }
    
    const completed = items.filter(item => item.completed).length;
    const total = items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    console.log(`  用戶 ${r.user_id}: ${completed}/${total} (${percentage}%)`);
    
    // 顯示任務詳情
    if (items.length > 0) {
      items.forEach((item, idx) => {
        const status = item.completed ? '✓' : '○';
        console.log(`    ${status} ${item.text || '(無文字)'}`);
      });
    }
  });
});

console.log('\n');

// 5. 檢查今天的記錄
const today = new Date().toISOString().split('T')[0];
console.log(`5. 今天 (${today}) 的記錄：`);
const todayRecords = db.prepare(`
  SELECT id, user_id, date, items
  FROM routine_records 
  WHERE date = ?
`).all(today);

console.log(`  記錄數: ${todayRecords.length}`);
todayRecords.forEach(r => {
  let items = [];
  try {
    items = JSON.parse(r.items);
  } catch (e) {
    console.log(`  ⚠️ 用戶 ${r.user_id}: 無法解析 items`);
    return;
  }
  
  const completed = items.filter(item => item.completed).length;
  const total = items.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  console.log(`  用戶 ${r.user_id}: ${completed}/${total} (${percentage}%)`);
});

console.log('\n');

// 6. 檢查 API 會返回什麼
console.log('6. 模擬 API /routines/history 返回的數據：');
const apiRecords = db.prepare(`
  SELECT id, user_id, department_id, date, items
  FROM routine_records 
  ORDER BY date DESC 
  LIMIT 30
`).all();

console.log(`  返回記錄數: ${apiRecords.length}`);
console.log('  日期分布:');
const dateGroups = {};
apiRecords.forEach(r => {
  if (!dateGroups[r.date]) {
    dateGroups[r.date] = 0;
  }
  dateGroups[r.date]++;
});

Object.keys(dateGroups).sort().reverse().forEach(date => {
  console.log(`    ${date}: ${dateGroups[date]} 筆記錄`);
});

console.log('\n=== 診斷完成 ===');
db.close();
