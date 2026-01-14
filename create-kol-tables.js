const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Creating KOL Management Tables ===\n');

try {
  // 1. KOL Profiles Table
  console.log('Creating kol_profiles table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS kol_profiles (
      id TEXT PRIMARY KEY,
      facebook_id TEXT NOT NULL,
      platform_account TEXT NOT NULL,
      contact_info TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      UNIQUE(facebook_id, platform_account)
    )
  `);
  console.log('✅ kol_profiles table created');

  // 2. KOL Contracts Table
  console.log('Creating kol_contracts table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS kol_contracts (
      id TEXT PRIMARY KEY,
      kol_id TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      salary_amount REAL NOT NULL DEFAULT 0,
      deposit_amount REAL NOT NULL DEFAULT 0,
      unpaid_amount REAL NOT NULL DEFAULT 0,
      cleared_amount REAL NOT NULL DEFAULT 0,
      total_paid REAL NOT NULL DEFAULT 0,
      contract_type TEXT NOT NULL DEFAULT 'NORMAL',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      FOREIGN KEY (kol_id) REFERENCES kol_profiles(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ kol_contracts table created');

  // 3. KOL Payments Table
  console.log('Creating kol_payments table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS kol_payments (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_type TEXT NOT NULL DEFAULT 'SALARY',
      notes TEXT,
      attachment TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      FOREIGN KEY (contract_id) REFERENCES kol_contracts(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ kol_payments table created');

  // 4. KOL Operation Logs Table (for audit trail)
  console.log('Creating kol_operation_logs table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS kol_operation_logs (
      id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      changes TEXT,
      created_at TEXT NOT NULL
    )
  `);
  console.log('✅ kol_operation_logs table created');

  // Create indexes for better performance
  console.log('\nCreating indexes...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_kol_profiles_status ON kol_profiles(status);
    CREATE INDEX IF NOT EXISTS idx_kol_contracts_kol_id ON kol_contracts(kol_id);
    CREATE INDEX IF NOT EXISTS idx_kol_contracts_dates ON kol_contracts(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_kol_payments_contract_id ON kol_payments(contract_id);
    CREATE INDEX IF NOT EXISTS idx_kol_payments_date ON kol_payments(payment_date);
    CREATE INDEX IF NOT EXISTS idx_kol_logs_target ON kol_operation_logs(target_type, target_id);
  `);
  console.log('✅ Indexes created');

  console.log('\n=== All KOL tables created successfully! ===');
  
} catch (error) {
  console.error('❌ Error creating tables:', error);
  process.exit(1);
}

db.close();
