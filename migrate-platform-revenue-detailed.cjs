const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Adding detailed columns to platform_transactions table ===\n');

try {
  // 檢查欄位是否已存在
  const stmt = db.prepare("PRAGMA table_info(platform_transactions)");
  const columns = stmt.all();
  const existingColumns = columns.map(c => c.name);

  console.log('Existing columns:', existingColumns);

  const newColumns = [
    { name: 'lottery_wage', type: 'REAL DEFAULT 0', desc: '\u5f69\u7968\u5de5\u8d44' },
    { name: 'lottery_rebate', type: 'REAL DEFAULT 0', desc: '\u5f69\u7968\u53cd\u70b9' },
    { name: 'game_ag', type: 'REAL DEFAULT 0', desc: '\u771f\u4ebaAG' },
    { name: 'game_chess', type: 'REAL DEFAULT 0', desc: '\u68cb\u724c' },
    { name: 'game_rebate', type: 'REAL DEFAULT 0', desc: '\u5916\u63a5\u8fd4\u70b9' },
    { name: 'game_private', type: 'REAL DEFAULT 0', desc: '\u771f\u4eba\u79c1\u8fd4' },
    { name: 'lottery_dividend_receive', type: 'REAL DEFAULT 0', desc: '\u5f69\u7968\u9886\u53d6\u5206\u7ea2' },
    { name: 'lottery_dividend_send', type: 'REAL DEFAULT 0', desc: '\u5f69\u7968\u4e0b\u53d1\u5206\u7ea2' },
    { name: 'external_dividend_receive', type: 'REAL DEFAULT 0', desc: '\u5916\u63a5\u9886\u53d6\u5206\u7ea2' },
    { name: 'external_dividend_send', type: 'REAL DEFAULT 0', desc: '\u5916\u63a5\u4e0b\u53d1\u5206\u7ea2' }
  ];

  let addedCount = 0;
  let skippedCount = 0;

  for (const col of newColumns) {
    if (existingColumns.includes(col.name)) {
      console.log(`\u2713 Column ${col.name} already exists, skipping`);
      skippedCount++;
    } else {
      const sql = `ALTER TABLE platform_transactions ADD COLUMN ${col.name} ${col.type}`;
      db.exec(sql);
      console.log(`\u2713 Added column: ${col.name} (${col.desc})`);
      addedCount++;
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Added: ${addedCount} columns`);
  console.log(`Skipped: ${skippedCount} columns (already exist)`);
  console.log(`\nTotal columns: ${existingColumns.length + addedCount}`);

  // 驗證新欄位
  const finalColumns = db.prepare("PRAGMA table_info(platform_transactions)").all();
  console.log('\nFinal column list:');
  finalColumns.forEach(c => {
    console.log(`  - ${c.name} (${c.type})`);
  });

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}

console.log('\n✅ Migration completed successfully!');
