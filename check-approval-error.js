const Database = require('better-sqlite3');

console.log('=== Check Approval Route Error ===\n');

const db = new Database('/app/data/taskflow.db');

console.log('1. Check approval_authorizations table:');
try {
  const tableInfo = db.prepare("PRAGMA table_info(approval_authorizations)").all();
  if (tableInfo.length > 0) {
    console.log('  [OK] Table exists');
    console.log('  Columns:', tableInfo.map(c => c.name).join(', '));
    
    const count = db.prepare('SELECT COUNT(*) as count FROM approval_authorizations').get();
    console.log(`  Records: ${count.count}`);
  } else {
    console.log('  [ERROR] Table does not exist');
  }
} catch (error) {
  console.log('  [ERROR]', error.message);
}

console.log('\n2. Test query that might be failing:');
try {
  const userId = 'admin-1766955365557'; // Se7en's ID
  const result = db.prepare(`
    SELECT * FROM approval_authorizations 
    WHERE user_id = ? 
    AND status = 'ACTIVE'
  `).get(userId);
  
  if (result) {
    console.log('  [OK] Query successful');
    console.log('  Result:', JSON.stringify(result, null, 2));
  } else {
    console.log('  [INFO] No active authorization found for user');
  }
} catch (error) {
  console.log('  [ERROR]', error.message);
}

console.log('\n3. Check recent reports:');
try {
  const reports = db.prepare(`
    SELECT id, user_id, created_at, date(created_at) as report_date
    FROM reports
    ORDER BY created_at DESC
    LIMIT 5
  `).all();
  
  console.log(`  Found ${reports.length} recent reports:`);
  reports.forEach(r => {
    console.log(`    - ${r.report_date}: ${r.id.substring(0, 30)}...`);
  });
} catch (error) {
  console.log('  [ERROR]', error.message);
}

db.close();
