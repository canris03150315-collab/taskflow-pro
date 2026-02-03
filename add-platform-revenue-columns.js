const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Adding new columns to platform_transactions table ===\n');

try {
  // 先檢查表是否存在
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_transactions'").all();
  if (tables.length === 0) {
    console.error('ERROR: platform_transactions table does not exist!');
    process.exit(1);
  }

  // 獲取現有欄位
  const tableInfo = db.prepare('PRAGMA table_info(platform_transactions)').all();
  const existingColumns = tableInfo.map(col => col.name);
  
  console.log('Current columns:', existingColumns.join(', '));
  console.log('');

  // 定義要新增的欄位
  const columnsToAdd = [
    { name: 'rebate_amount', type: 'REAL DEFAULT 0', description: '\u53cd\u6c34' },
    { name: 'real_person_count', type: 'INTEGER DEFAULT 0', description: '\u771f\u4eba\u6570' },
    { name: 'chess_amount', type: 'REAL DEFAULT 0', description: '\u68cb\u724c' },
    { name: 'lottery_private_return', type: 'REAL DEFAULT 0', description: '\u5f69\u7968\u79c1\u8fd4' },
    { name: 'claim_dividend', type: 'REAL DEFAULT 0', description: '\u9818\u53d6\u5206\u7d05' },
    { name: 'delisted_dividend_1', type: 'REAL DEFAULT 0', description: '\u4e0b\u67b6\u5206\u7d05 1' },
    { name: 'delisted_dividend_2', type: 'REAL DEFAULT 0', description: '\u4e0b\u67b6\u5206\u7d05 2' }
  ];

  let addedCount = 0;
  let skippedCount = 0;

  for (const column of columnsToAdd) {
    if (existingColumns.includes(column.name)) {
      console.log('\u2022 ' + column.name + ' - already exists (skipped)');
      skippedCount++;
    } else {
      try {
        db.exec(`ALTER TABLE platform_transactions ADD COLUMN ${column.name} ${column.type}`);
        console.log('\u2713 ' + column.name + ' - added successfully');
        addedCount++;
      } catch (error) {
        console.error('\u2717 ' + column.name + ' - failed: ' + error.message);
        throw error;
      }
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log('Added: ' + addedCount + ' columns');
  console.log('Skipped: ' + skippedCount + ' columns (already exist)');
  console.log('');

  // 驗證最終表結構
  const finalTableInfo = db.prepare('PRAGMA table_info(platform_transactions)').all();
  console.log('Final column count: ' + finalTableInfo.length);
  console.log('');
  console.log('SUCCESS: All columns processed successfully!');

} catch (error) {
  console.error('');
  console.error('ERROR:', error.message);
  process.exit(1);
} finally {
  db.close();
}
