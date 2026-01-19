const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

console.log('=== Testing KOL Contract Creation ===\n');

const db = new Database('/app/data/taskflow.db');

// 1. Get a test KOL
const kol = db.prepare('SELECT id, facebook_id, platform_account FROM kol_profiles LIMIT 1').get();
if (!kol) {
  console.log('❌ No KOL found in database');
  db.close();
  process.exit(1);
}
console.log(`Test KOL: ${kol.facebook_id || kol.platform_account} (${kol.id})`);

// 2. Get test user
const user = db.prepare("SELECT id, username FROM users WHERE role = 'ADMIN' LIMIT 1").get();
if (!user) {
  console.log('❌ No admin user found');
  db.close();
  process.exit(1);
}
console.log(`Test User: ${user.username} (${user.id})`);

// 3. Test INSERT with 14 values (matching 14 columns)
const now = new Date().toISOString();
const contractId = uuidv4();

try {
  const stmt = db.prepare(`
    INSERT INTO kol_contracts (
      id, kol_id, start_date, end_date, salary_amount, deposit_amount, 
      unpaid_amount, cleared_amount, total_paid, contract_type, notes, 
      created_at, updated_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    contractId, 
    kol.id, 
    '2026-01-16', 
    '2026-12-31', 
    50000, 
    10000,
    50000, 
    0, 
    0, 
    'NORMAL',
    'Test contract', 
    now, 
    now, 
    user.id
  );
  
  console.log('\n✅ Contract created successfully!');
  console.log(`   Contract ID: ${contractId}`);
  console.log(`   Changes: ${result.changes}`);
  
  // Verify
  const created = db.prepare('SELECT * FROM kol_contracts WHERE id = ?').get(contractId);
  console.log('\nVerification:');
  console.log(`   KOL ID: ${created.kol_id}`);
  console.log(`   Salary: ${created.salary_amount}`);
  console.log(`   Deposit: ${created.deposit_amount}`);
  console.log(`   Type: ${created.contract_type}`);
  console.log(`   Created By: ${created.created_by}`);
  
  // Clean up test data
  db.prepare('DELETE FROM kol_contracts WHERE id = ?').run(contractId);
  console.log('\n✅ Test contract deleted (cleanup)');
  
} catch (error) {
  console.log('\n❌ Failed to create contract:');
  console.log(`   Error: ${error.message}`);
  console.log(`   Code: ${error.code}`);
}

db.close();
console.log('\n=== Test Complete ===');
