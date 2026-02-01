const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Creating platform revenue tables...');

try {
  // 1. 主表：平台營收數據
  const createMainTable = `
    CREATE TABLE IF NOT EXISTS platform_transactions (
      id TEXT PRIMARY KEY,
      platform_name TEXT NOT NULL,
      date TEXT NOT NULL,
      
      lottery_amount REAL DEFAULT 0,
      external_game_amount REAL DEFAULT 0,
      lottery_dividend REAL DEFAULT 0,
      external_dividend REAL DEFAULT 0,
      private_return REAL DEFAULT 0,
      deposit_amount REAL DEFAULT 0,
      withdrawal_amount REAL DEFAULT 0,
      loan_amount REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      
      uploaded_by TEXT NOT NULL,
      uploaded_by_name TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      upload_file_name TEXT,
      
      last_modified_by TEXT,
      last_modified_by_name TEXT,
      last_modified_at TEXT,
      
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      
      UNIQUE(platform_name, date)
    )
  `;
  
  db.exec(createMainTable);
  console.log('✓ Created platform_transactions table');
  
  // 2. 歷史記錄表：追蹤所有變更
  const createHistoryTable = `
    CREATE TABLE IF NOT EXISTS platform_transaction_history (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_by TEXT NOT NULL,
      action_by_name TEXT NOT NULL,
      action_at TEXT NOT NULL,
      old_data TEXT,
      new_data TEXT,
      changes_summary TEXT,
      created_at TEXT NOT NULL
    )
  `;
  
  db.exec(createHistoryTable);
  console.log('✓ Created platform_transaction_history table');
  
  // 3. 創建索引以提升查詢效能
  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_platform_transactions_date ON platform_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_platform_transactions_platform ON platform_transactions(platform_name);
    CREATE INDEX IF NOT EXISTS idx_platform_transactions_uploaded_by ON platform_transactions(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_platform_transaction_history_transaction_id ON platform_transaction_history(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_platform_transaction_history_action_by ON platform_transaction_history(action_by);
    CREATE INDEX IF NOT EXISTS idx_platform_transaction_history_action_at ON platform_transaction_history(action_at);
  `;
  
  db.exec(createIndexes);
  console.log('✓ Created indexes');
  
  console.log('\nSUCCESS: All platform revenue tables created successfully!');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
} finally {
  db.close();
}
