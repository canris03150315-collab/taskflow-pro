const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Testing Extended Platform Revenue System ===\n');

try {
  // 1. Check table exists
  console.log('[1/5] Checking platform_transactions table...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_transactions'").all();
  if (tables.length === 0) {
    console.error('ERROR: platform_transactions table does not exist!');
    process.exit(1);
  }
  console.log('OK Table exists\n');

  // 2. Check all required columns
  console.log('[2/5] Checking table structure...');
  const tableInfo = db.prepare('PRAGMA table_info(platform_transactions)').all();
  const columnNames = tableInfo.map(col => col.name);
  
  const requiredColumns = [
    'id', 'platform_name', 'date',
    'rebate_amount', 'real_person_count', 'chess_amount',
    'external_game_amount', 'lottery_private_return', 'claim_dividend',
    'external_dividend', 'delisted_dividend_1', 'delisted_dividend_2',
    'private_return', 'deposit_amount', 'withdrawal_amount',
    'loan_amount', 'profit', 'balance', 'lottery_amount',
    'uploaded_by', 'uploaded_by_name', 'uploaded_at',
    'created_at', 'updated_at'
  ];

  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
  
  if (missingColumns.length > 0) {
    console.error('ERROR: Missing columns:', missingColumns.join(', '));
    process.exit(1);
  }
  
  console.log('OK All required columns exist (' + requiredColumns.length + ' columns)');
  console.log('   New columns: rebate_amount, real_person_count, chess_amount,');
  console.log('                lottery_private_return, claim_dividend,');
  console.log('                delisted_dividend_1, delisted_dividend_2\n');

  // 3. Check data integrity
  console.log('[3/5] Checking data integrity...');
  const recordCount = db.prepare('SELECT COUNT(*) as count FROM platform_transactions').get();
  console.log('OK Total records: ' + recordCount.count + '\n');

  // 4. Test query with new columns
  console.log('[4/5] Testing query with new columns...');
  const testQuery = `
    SELECT 
      platform_name,
      COUNT(*) as record_count,
      SUM(rebate_amount) as total_rebate,
      SUM(chess_amount) as total_chess,
      SUM(claim_dividend) as total_claim_dividend
    FROM platform_transactions
    GROUP BY platform_name
    LIMIT 3
  `;
  
  const testResult = db.prepare(testQuery).all();
  console.log('OK Query successful, sample results:');
  testResult.forEach(row => {
    console.log('   - ' + row.platform_name + ': ' + row.record_count + ' records');
  });
  console.log('');

  // 5. Check history table
  console.log('[5/5] Checking platform_transaction_history table...');
  const historyTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_transaction_history'").all();
  if (historyTables.length === 0) {
    console.error('WARNING: platform_transaction_history table does not exist!');
  } else {
    const historyCount = db.prepare('SELECT COUNT(*) as count FROM platform_transaction_history').get();
    console.log('OK History table exists with ' + historyCount.count + ' records\n');
  }

  console.log('=== All Tests Passed ===');
  console.log('');
  console.log('System is ready for extended platform revenue functionality!');
  console.log('');

} catch (error) {
  console.error('');
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
} finally {
  db.close();
}
