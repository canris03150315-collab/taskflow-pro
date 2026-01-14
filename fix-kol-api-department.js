const fs = require('fs');

console.log('=== Fix KOL API - Add Department Filter ===');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // 1. Fix GET /profiles - add department filter
  console.log('\n1. Fixing GET /profiles...');
  
  const oldProfilesQuery = "let query = 'SELECT * FROM kol_profiles WHERE 1=1';";
  const newProfilesQuery = `const userDept = req.query.departmentId || currentUser.department;
    let query = 'SELECT * FROM kol_profiles WHERE (department_id = ? OR department_id IS NULL)';
    const params = [userDept];`;
  
  if (content.includes(oldProfilesQuery)) {
    content = content.replace(oldProfilesQuery, newProfilesQuery);
    console.log('  Fixed GET /profiles query');
    
    // Also need to fix the params initialization
    content = content.replace(
      "const params = [];\n\n    if (status && status !== 'ALL') {",
      "if (status && status !== 'ALL') {"
    );
  }
  
  // 2. Fix POST /profiles - add department_id
  console.log('\n2. Fixing POST /profiles...');
  
  // Add department_id to INSERT
  const oldInsert = "INSERT INTO kol_profiles (id, platform, platform_id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by)";
  const newInsert = "INSERT INTO kol_profiles (id, platform, platform_id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by, department_id)";
  
  if (content.includes(oldInsert)) {
    content = content.replace(oldInsert, newInsert);
    console.log('  Fixed INSERT columns');
  }
  
  // Fix VALUES
  const oldValues = "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const newValues = "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  
  if (content.includes(oldValues)) {
    content = content.replace(oldValues, newValues);
    console.log('  Fixed VALUES placeholders');
  }
  
  // Fix run params - add departmentId
  const oldRun = ".run(id, platform || 'FACEBOOK', actualPlatformId, actualPlatformId, platformAccount, contactInfo || null, status || 'ACTIVE', notes || null, now, now, currentUser.id);";
  const newRun = ".run(id, platform || 'FACEBOOK', actualPlatformId, actualPlatformId, platformAccount, contactInfo || null, status || 'ACTIVE', notes || null, now, now, currentUser.id, req.body.departmentId || currentUser.department);";
  
  if (content.includes(oldRun)) {
    content = content.replace(oldRun, newRun);
    console.log('  Fixed run params');
  }
  
  // 3. Fix GET /contracts - add department filter
  console.log('\n3. Fixing GET /contracts...');
  
  const oldContractsQuery = "let query = 'SELECT * FROM kol_contracts WHERE 1=1';";
  const newContractsQuery = `const userDept = req.query.departmentId || currentUser.department;
    let query = 'SELECT * FROM kol_contracts WHERE (department_id = ? OR department_id IS NULL)';
    const params = [userDept];`;
  
  if (content.includes(oldContractsQuery)) {
    content = content.replace(oldContractsQuery, newContractsQuery);
    console.log('  Fixed GET /contracts query');
    
    // Fix params
    content = content.replace(
      /const params = \[\];\s*\n\s*if \(kolId\)/,
      "if (kolId)"
    );
  }
  
  // 4. Fix POST /contracts - add department_id
  console.log('\n4. Fixing POST /contracts...');
  
  // Find and fix contracts INSERT
  const oldContractInsert = "INSERT INTO kol_contracts (id, kol_id, start_date, end_date, salary_amount, deposit_amount, unpaid_amount, cleared_amount, total_paid, contract_type, notes, created_at, updated_at, created_by)";
  const newContractInsert = "INSERT INTO kol_contracts (id, kol_id, start_date, end_date, salary_amount, deposit_amount, unpaid_amount, cleared_amount, total_paid, contract_type, notes, created_at, updated_at, created_by, department_id)";
  
  if (content.includes(oldContractInsert)) {
    content = content.replace(oldContractInsert, newContractInsert);
    
    // Fix VALUES for contracts (14 -> 15)
    content = content.replace(
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    console.log('  Fixed contracts INSERT');
  }
  
  // 5. Fix GET /payments - add department filter
  console.log('\n5. Fixing GET /payments...');
  
  const oldPaymentsQuery = "let query = 'SELECT * FROM kol_payments WHERE 1=1';";
  const newPaymentsQuery = `const userDept = req.query.departmentId || currentUser.department;
    let query = 'SELECT * FROM kol_payments WHERE (department_id = ? OR department_id IS NULL)';
    const params = [userDept];`;
  
  if (content.includes(oldPaymentsQuery)) {
    content = content.replace(oldPaymentsQuery, newPaymentsQuery);
    console.log('  Fixed GET /payments query');
  }
  
  // 6. Fix POST /payments - add department_id
  console.log('\n6. Fixing POST /payments...');
  
  const oldPaymentInsert = "INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by)";
  const newPaymentInsert = "INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by, department_id)";
  
  if (content.includes(oldPaymentInsert)) {
    content = content.replace(oldPaymentInsert, newPaymentInsert);
    
    // Fix VALUES for payments (8 -> 9)
    content = content.replace(
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    console.log('  Fixed payments INSERT');
  }
  
  // 7. Fix stats query - add department filter
  console.log('\n7. Fixing GET /stats...');
  
  const oldStatsTotal = "const totalKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles').get().count;";
  const newStatsTotal = `const userDept = req.query.departmentId || currentUser.department;
    const totalKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE department_id = ? OR department_id IS NULL').get(userDept).count;`;
  
  if (content.includes(oldStatsTotal)) {
    content = content.replace(oldStatsTotal, newStatsTotal);
    console.log('  Fixed stats totalKOLs');
  }
  
  // Fix other stats queries
  content = content.replace(
    "const activeKOLs = dbCall(db, 'prepare', `SELECT COUNT(*) as count FROM kol_profiles WHERE status = 'ACTIVE'`).get().count;",
    "const activeKOLs = dbCall(db, 'prepare', `SELECT COUNT(*) as count FROM kol_profiles WHERE status = 'ACTIVE' AND (department_id = ? OR department_id IS NULL)`).get(userDept).count;"
  );
  
  content = content.replace(
    "const activeContracts = dbCall(db, 'prepare', `SELECT COUNT(*) as count FROM kol_contracts WHERE end_date >= date('now')`).get().count;",
    "const activeContracts = dbCall(db, 'prepare', `SELECT COUNT(*) as count FROM kol_contracts WHERE end_date >= date('now') AND (department_id = ? OR department_id IS NULL)`).get(userDept).count;"
  );
  
  content = content.replace(
    "const totalUnpaid = dbCall(db, 'prepare', 'SELECT SUM(unpaid_amount) as total FROM kol_contracts').get().total || 0;",
    "const totalUnpaid = dbCall(db, 'prepare', 'SELECT SUM(unpaid_amount) as total FROM kol_contracts WHERE department_id = ? OR department_id IS NULL').get(userDept).total || 0;"
  );
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n=== Done ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
