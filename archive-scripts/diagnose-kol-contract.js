const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnosing KOL Contract Creation ===\n');

// 1. Check kol_contracts table structure
console.log('1. kol_contracts table structure:');
const tableInfo = db.prepare("PRAGMA table_info(kol_contracts)").all();
console.log('Columns:', tableInfo.map(c => c.name).join(', '));
console.log('');

// 2. Check if table exists
console.log('2. Check if kol_contracts table exists:');
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kol_contracts'").get();
console.log('Table exists:', !!tableExists);
console.log('');

// 3. Check kol_profiles table
console.log('3. Check kol_profiles:');
const profiles = db.prepare("SELECT id, platform, platform_id, platform_account FROM kol_profiles LIMIT 5").all();
console.log('Sample profiles:', JSON.stringify(profiles, null, 2));
console.log('');

// 4. Try to simulate contract creation
console.log('4. Simulate contract creation:');
try {
  const testData = {
    id: 'test-contract-' + Date.now(),
    kol_id: profiles[0]?.id || 'test-kol',
    start_date: '2026-01-19',
    end_date: '2026-01-26',
    salary_amount: 4000,
    deposit_amount: 0,
    unpaid_amount: 4000,
    contract_type: 'NORMAL',
    notes: 'Test contract',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  console.log('Test data:', JSON.stringify(testData, null, 2));
  
  // Check required columns
  const requiredColumns = ['id', 'kol_id', 'salary_amount', 'unpaid_amount'];
  const missingColumns = requiredColumns.filter(col => 
    !tableInfo.find(c => c.name === col)
  );
  
  if (missingColumns.length > 0) {
    console.log('ERROR: Missing required columns:', missingColumns.join(', '));
  } else {
    console.log('All required columns exist');
  }
  
} catch (error) {
  console.error('Simulation error:', error.message);
}

console.log('\n=== Diagnosis Complete ===');
db.close();
