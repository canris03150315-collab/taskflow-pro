const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Adding detailed columns to platform_transactions table ===');

try {
  const newColumns = [
    'lottery_wage',
    'lottery_rebate',
    'game_ag',
    'game_chess',
    'game_rebate',
    'game_private',
    'lottery_dividend_receive',
    'lottery_dividend_send',
    'external_dividend_receive',
    'external_dividend_send'
  ];

  let addedCount = 0;

  for (const colName of newColumns) {
    try {
      const sql = `ALTER TABLE platform_transactions ADD COLUMN ${colName} REAL DEFAULT 0`;
      db.exec(sql);
      console.log(`Added column: ${colName}`);
      addedCount++;
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`Column ${colName} already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  console.log(`\nMigration Complete - Added: ${addedCount} columns`);

  const finalColumns = db.prepare("PRAGMA table_info(platform_transactions)").all();
  console.log(`\nTotal columns: ${finalColumns.length}`);

} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}

console.log('Migration completed successfully!');
