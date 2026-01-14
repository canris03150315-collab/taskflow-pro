const Database = require('better-sqlite3');
const path = require('path');

console.log('=== Diagnosing KOL Import Issues ===\n');

try {
  const dbPath = path.join('/app/data', 'taskflow.db');
  const db = new Database(dbPath);
  
  // 1. Check imported data
  console.log('1. Checking imported KOL profiles...');
  const profiles = db.prepare('SELECT * FROM kol_profiles ORDER BY created_at DESC LIMIT 10').all();
  console.log(`Found ${profiles.length} profiles:`);
  profiles.forEach(p => {
    console.log(`  - ID: ${p.id}, FB: ${p.facebook_id}, Platform: ${p.platform_account}, Status: ${p.status}`);
  });
  
  // 2. Check contracts
  console.log('\n2. Checking contracts...');
  const contracts = db.prepare('SELECT * FROM kol_contracts ORDER BY created_at DESC LIMIT 10').all();
  console.log(`Found ${contracts.length} contracts:`);
  contracts.forEach(c => {
    console.log(`  - KOL ID: ${c.kol_id}, Salary: ${c.salary_amount}, Unpaid: ${c.unpaid_amount}`);
  });
  
  // 3. Check if profiles have contracts
  console.log('\n3. Checking profile-contract relationships...');
  const profilesWithContracts = db.prepare(`
    SELECT p.id, p.facebook_id, COUNT(c.id) as contract_count
    FROM kol_profiles p
    LEFT JOIN kol_contracts c ON p.id = c.kol_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 10
  `).all();
  
  profilesWithContracts.forEach(p => {
    console.log(`  - Profile ${p.facebook_id}: ${p.contract_count} contracts`);
  });
  
  db.close();
  console.log('\n=== Diagnosis Complete ===');
  
} catch (error) {
  console.error('ERROR:', error);
  process.exit(1);
}
