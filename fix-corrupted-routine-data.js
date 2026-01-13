const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fixing corrupted routine records ===\n');

// 查找所有損壞的記錄（completed_items 包含非對象元素）
const allRecords = db.prepare('SELECT * FROM routine_records').all();

let fixedCount = 0;
let deletedCount = 0;

allRecords.forEach(record => {
  try {
    const items = JSON.parse(record.completed_items || '[]');
    
    // 檢查是否有損壞的數據（布林值或其他非對象類型）
    const hasCorruption = items.some(item => typeof item !== 'object' || !item.text);
    
    if (hasCorruption) {
      console.log(`Found corrupted record: ${record.id}`);
      console.log(`  User: ${record.user_id}`);
      console.log(`  Date: ${record.date}`);
      console.log(`  Data: ${record.completed_items}`);
      
      // 嘗試修復：過濾掉損壞的元素
      const validItems = items.filter(item => typeof item === 'object' && item.text);
      
      if (validItems.length > 0) {
        // 如果還有有效的項目，更新記錄
        db.prepare('UPDATE routine_records SET completed_items = ? WHERE id = ?')
          .run(JSON.stringify(validItems), record.id);
        console.log(`  ✓ Fixed: kept ${validItems.length} valid items\n`);
        fixedCount++;
      } else {
        // 如果沒有有效項目，刪除記錄（讓用戶重新開始）
        db.prepare('DELETE FROM routine_records WHERE id = ?').run(record.id);
        console.log(`  ✗ Deleted: no valid items remaining\n`);
        deletedCount++;
      }
    }
  } catch (e) {
    console.log(`Error processing record ${record.id}:`, e.message);
  }
});

console.log('=== Summary ===');
console.log(`Fixed: ${fixedCount} records`);
console.log(`Deleted: ${deletedCount} records`);
console.log('Done');

db.close();
