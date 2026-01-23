const fs = require('fs');

console.log('=== Fix KOL API - Add Department Filter V2 ===');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // 1. Fix GET /profiles - replace entire query setup
  console.log('\n1. Fixing GET /profiles...');
  
  const oldProfilesBlock = `let query = 'SELECT * FROM kol_profiles WHERE 1=1';
    const params = [];

    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (facebook_id LIKE ? OR platform_account LIKE ?)';
      params.push(\`%\${search}%\`, \`%\${search}%\`);
    }`;
  
  const newProfilesBlock = `const userDept = req.query.departmentId || currentUser.department;
    let query = 'SELECT * FROM kol_profiles WHERE (department_id = ? OR department_id IS NULL)';
    const params = [userDept];

    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (facebook_id LIKE ? OR platform_account LIKE ?)';
      params.push(\`%\${search}%\`, \`%\${search}%\`);
    }`;
  
  if (content.includes(oldProfilesBlock)) {
    content = content.replace(oldProfilesBlock, newProfilesBlock);
    console.log('  SUCCESS: Fixed GET /profiles');
  } else {
    console.log('  WARNING: GET /profiles pattern not found');
  }
  
  // 2. Fix POST /profiles - add department_id to INSERT
  console.log('\n2. Fixing POST /profiles...');
  
  const oldInsert = "INSERT INTO kol_profiles (id, platform, platform_id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by)";
  const newInsert = "INSERT INTO kol_profiles (id, platform, platform_id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by, department_id)";
  
  if (content.includes(oldInsert)) {
    content = content.replace(oldInsert, newInsert);
    
    // Fix VALUES (11 -> 12)
    content = content.replace(
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    // Fix run params
    const oldRun = ".run(id, platform || 'FACEBOOK', actualPlatformId, actualPlatformId, platformAccount, contactInfo || null, status || 'ACTIVE', notes || null, now, now, currentUser.id);";
    const newRun = ".run(id, platform || 'FACEBOOK', actualPlatformId, actualPlatformId, platformAccount, contactInfo || null, status || 'ACTIVE', notes || null, now, now, currentUser.id, req.body.departmentId || currentUser.department);";
    
    if (content.includes(oldRun)) {
      content = content.replace(oldRun, newRun);
      console.log('  SUCCESS: Fixed POST /profiles');
    }
  }
  
  // 3. Fix stats - add department filter
  console.log('\n3. Fixing GET /stats...');
  
  const oldStatsTotal = "const totalKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles').get().count;";
  const newStatsTotal = `const userDept = req.query.departmentId || currentUser.department;
    const totalKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE department_id = ? OR department_id IS NULL').get(userDept).count;`;
  
  if (content.includes(oldStatsTotal)) {
    content = content.replace(oldStatsTotal, newStatsTotal);
    
    // Fix other stats
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
    
    console.log('  SUCCESS: Fixed GET /stats');
  }
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n=== Done ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
