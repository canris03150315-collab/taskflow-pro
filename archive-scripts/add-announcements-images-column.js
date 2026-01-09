const Database = require('better-sqlite3');
const fs = require('fs');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

try {
  console.log('開始添加 images 欄位到 announcements 表...');
  
  // 檢查欄位是否已存在
  const tableInfo = db.prepare("PRAGMA table_info(announcements)").all();
  const hasImagesColumn = tableInfo.some(col => col.name === 'images');
  
  if (hasImagesColumn) {
    console.log('images 欄位已存在，跳過添加');
  } else {
    // 添加 images 欄位（JSON 格式，存儲 Base64 圖片陣列）
    db.exec("ALTER TABLE announcements ADD COLUMN images TEXT DEFAULT '[]'");
    console.log('✅ 成功添加 images 欄位');
  }
  
  // 驗證
  const updatedTableInfo = db.prepare("PRAGMA table_info(announcements)").all();
  console.log('\n當前 announcements 表結構:');
  updatedTableInfo.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}`);
  });
  
  console.log('\n✅ 資料庫修改完成');
  
} catch (error) {
  console.error('❌ 錯誤:', error.message);
  process.exit(1);
} finally {
  db.close();
}
