const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Creating KOL Weekly Payments Table ===\n');

try {
  db.prepare('BEGIN TRANSACTION').run();
  
  console.log('Step 1: Creating kol_weekly_payments table...');
  db.prepare(`
    CREATE TABLE IF NOT EXISTS kol_weekly_payments (
      id TEXT PRIMARY KEY,
      kol_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      updated_at TEXT,
      updated_by TEXT,
      FOREIGN KEY (kol_id) REFERENCES kol_profiles(id) ON DELETE CASCADE
    )
  `).run();
  
  console.log('Step 2: Creating indexes...');
  db.prepare('CREATE INDEX IF NOT EXISTS idx_kol_payments_kol_id ON kol_weekly_payments(kol_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_kol_payments_date ON kol_weekly_payments(payment_date)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_kol_payments_created_by ON kol_weekly_payments(created_by)').run();
  
  db.prepare('COMMIT').run();
  
  console.log('\n=== Table Creation Complete ===');
  console.log('✅ kol_weekly_payments table created');
  console.log('✅ Indexes created');
  
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='kol_weekly_payments'").get();
  console.log('\nTable structure:');
  console.log(tableInfo.sql);
  
} catch (error) {
  db.prepare('ROLLBACK').run();
  console.error('Error:', error);
  throw error;
}

db.close();
