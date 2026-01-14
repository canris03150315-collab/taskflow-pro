const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Add KOL Department Column ===');

try {
  // 1. Add department_id to kol_profiles
  const profileInfo = db.pragma("table_info(kol_profiles)");
  const hasProfileDept = profileInfo.some(col => col.name === 'department_id');
  
  if (!hasProfileDept) {
    console.log('Adding department_id to kol_profiles...');
    db.exec("ALTER TABLE kol_profiles ADD COLUMN department_id TEXT");
    console.log('SUCCESS: department_id added to kol_profiles');
  } else {
    console.log('kol_profiles.department_id already exists');
  }
  
  // 2. Add department_id to kol_contracts
  const contractInfo = db.pragma("table_info(kol_contracts)");
  const hasContractDept = contractInfo.some(col => col.name === 'department_id');
  
  if (!hasContractDept) {
    console.log('Adding department_id to kol_contracts...');
    db.exec("ALTER TABLE kol_contracts ADD COLUMN department_id TEXT");
    console.log('SUCCESS: department_id added to kol_contracts');
  } else {
    console.log('kol_contracts.department_id already exists');
  }
  
  // 3. Add department_id to kol_payments
  const paymentInfo = db.pragma("table_info(kol_payments)");
  const hasPaymentDept = paymentInfo.some(col => col.name === 'department_id');
  
  if (!hasPaymentDept) {
    console.log('Adding department_id to kol_payments...');
    db.exec("ALTER TABLE kol_payments ADD COLUMN department_id TEXT");
    console.log('SUCCESS: department_id added to kol_payments');
  } else {
    console.log('kol_payments.department_id already exists');
  }
  
  // Verify
  console.log('\nVerifying columns:');
  const updatedProfileInfo = db.pragma("table_info(kol_profiles)");
  console.log('kol_profiles columns:', updatedProfileInfo.map(c => c.name).join(', '));
  
  db.close();
  console.log('\n=== Done ===');
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
