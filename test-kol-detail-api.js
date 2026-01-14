const Database = require('better-sqlite3');
const path = require('path');

console.log('=== Testing KOL Detail API ===\n');

try {
  const dbPath = path.join('/app/data', 'taskflow.db');
  const db = new Database(dbPath);
  
  // Get first KOL
  const profile = db.prepare('SELECT * FROM kol_profiles LIMIT 1').get();
  
  if (!profile) {
    console.log('No profiles found');
    process.exit(0);
  }
  
  console.log('Testing profile:', profile.facebook_id);
  console.log('Profile data:', JSON.stringify(profile, null, 2));
  
  // Get contracts
  const contracts = db.prepare('SELECT * FROM kol_contracts WHERE kol_id = ?').all(profile.id);
  console.log('\nContracts:', contracts.length);
  if (contracts.length > 0) {
    console.log('First contract:', JSON.stringify(contracts[0], null, 2));
  }
  
  // Get payments
  const payments = db.prepare(`
    SELECT p.* FROM kol_payments p
    JOIN kol_contracts c ON p.contract_id = c.id
    WHERE c.kol_id = ?
  `).all(profile.id);
  console.log('\nPayments:', payments.length);
  
  db.close();
  
} catch (error) {
  console.error('ERROR:', error);
  process.exit(1);
}
