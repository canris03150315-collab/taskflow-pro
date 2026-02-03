const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// 檢查表是否存在
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_conversations'").all();
console.log('ai_conversations 表存在:', tables.length > 0);

if (tables.length > 0) {
  // 檢查表結構
  const tableInfo = db.prepare("PRAGMA table_info(ai_conversations)").all();
  console.log('\n表結構:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
  // 檢查記錄數量
  const count = db.prepare("SELECT COUNT(*) as count FROM ai_conversations").get();
  console.log('\n總記錄數:', count.count);
  
  // 顯示最近 5 條記錄
  if (count.count > 0) {
    const recent = db.prepare("SELECT * FROM ai_conversations ORDER BY created_at DESC LIMIT 5").all();
    console.log('\n最近 5 條記錄:');
    recent.forEach(record => {
      console.log(`  - [${record.role}] ${record.message.substring(0, 50)}... (${record.created_at})`);
    });
  }
} else {
  console.log('\n❌ ai_conversations 表不存在！需要創建。');
}

db.close();
