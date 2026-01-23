const fs = require('fs');

console.log('=== Fix KOL Import Excel - Add Department ID ===');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // 1. Fix INSERT for new profiles - add department_id
  console.log('\n1. Fixing INSERT for new profiles...');
  
  const oldInsert = "INSERT INTO kol_profiles (id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const newInsert = "INSERT INTO kol_profiles (id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  
  if (content.includes(oldInsert)) {
    content = content.replace(oldInsert, newInsert);
    console.log('  Fixed INSERT statement');
  }
  
  // 2. Fix the run() params for profiles
  const oldRun1 = ".run(\n            kolId, row.facebookId, row.platformAccount, row.contactInfo || null, row.status || 'ACTIVE', row.notes || null, now, now, currentUser.id\n          );";
  const newRun1 = ".run(\n            kolId, row.facebookId, row.platformAccount, row.contactInfo || null, row.status || 'ACTIVE', row.notes || null, now, now, currentUser.id, row.departmentId || currentUser.department\n          );";
  
  if (content.includes(oldRun1)) {
    content = content.replace(oldRun1, newRun1);
    console.log('  Fixed run params for profiles');
  } else {
    // Try alternative pattern
    content = content.replace(
      /\.run\(\s*kolId,\s*row\.facebookId,\s*row\.platformAccount,\s*row\.contactInfo\s*\|\|\s*null,\s*row\.status\s*\|\|\s*'ACTIVE',\s*row\.notes\s*\|\|\s*null,\s*now,\s*now,\s*currentUser\.id\s*\)/g,
      ".run(kolId, row.facebookId, row.platformAccount, row.contactInfo || null, row.status || 'ACTIVE', row.notes || null, now, now, currentUser.id, row.departmentId || currentUser.department)"
    );
    console.log('  Fixed run params (regex)');
  }
  
  // 3. Fix contracts INSERT - add department_id (in import-excel route)
  console.log('\n2. Fixing contracts INSERT in import...');
  
  // The contracts INSERT in import-excel has 14 columns, need to add department_id
  const oldContractInsert = "INSERT INTO kol_contracts (id, kol_id, start_date, end_date, salary_amount, deposit_amount, unpaid_amount, cleared_amount, total_paid, contract_type, notes, created_at, updated_at, created_by)";
  const newContractInsert = "INSERT INTO kol_contracts (id, kol_id, start_date, end_date, salary_amount, deposit_amount, unpaid_amount, cleared_amount, total_paid, contract_type, notes, created_at, updated_at, created_by, department_id)";
  
  // Count occurrences and replace all
  const contractMatches = (content.match(new RegExp(oldContractInsert.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log(`  Found ${contractMatches} contract INSERT statements`);
  
  if (contractMatches > 0) {
    content = content.replace(new RegExp(oldContractInsert.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newContractInsert);
    
    // Fix VALUES (14 -> 15 placeholders)
    content = content.replace(
      /VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)/g,
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    console.log('  Fixed contract INSERT statements');
  }
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n=== Done ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
