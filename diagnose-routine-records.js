const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 診斷每日任務記錄 ===\n');

// 1. 檢查最近 7 天的記錄
const recentRecords = db.prepare(`
  SELECT id, user_id, department_id, date, completed_items
  FROM routine_records 
  WHERE date >= date('now', '-7 days')
  ORDER BY date DESC
`).all();

console.log(`最近 7 天的記錄數量: ${recentRecords.length}\n`);

if (recentRecords.length > 0) {
  console.log('記錄詳情:');
  recentRecords.forEach(r => {
    const items = JSON.parse(r.completed_items || '[]');
    const completed = items.filter(item => item.completed).length;
    const total = items.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    console.log(`  - ${r.date} | User: ${r.user_id} | 部門: ${r.department_id}`);
    console.log(`    完成: ${completed}/${total} (${percent}%)`);
    console.log(`    Items: ${JSON.stringify(items).substring(0, 100)}...`);
  });
}

// 2. 檢查欄位名稱
console.log('\n=== 檢查 routine_records 表結構 ===');
const tableInfo = db.prepare("PRAGMA table_info(routine_records)").all();
console.log('欄位列表:', tableInfo.map(c => c.name).join(', '));

// 3. 檢查是否有 items 欄位（錯誤的）
const hasItems = tableInfo.some(c => c.name === 'items');
const hasCompletedItems = tableInfo.some(c => c.name === 'completed_items');
console.log(`\n有 'items' 欄位: ${hasItems}`);
console.log(`有 'completed_items' 欄位: ${hasCompletedItems}`);

db.close();
console.log('\n診斷完成');
