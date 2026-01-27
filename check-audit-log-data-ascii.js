const Database = require('better-sqlite3');

console.log('=== Check Audit Log Data ===\n');

const db = new Database('/app/data/taskflow.db');

// 1. Check approval_audit_log table and get sample data
console.log('1. approval_audit_log table:');
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM approval_audit_log').get();
  console.log('   Total records:', count.count);
  
  if (count.count > 0) {
    const samples = db.prepare('SELECT * FROM approval_audit_log ORDER BY created_at DESC LIMIT 3').all();
    console.log('\n   Sample records:');
    samples.forEach((r, i) => {
      console.log('   ' + (i + 1) + '. Action:', r.action);
      console.log('      User:', r.user_name, '(' + r.user_role + ')');
      console.log('      Target:', r.target_user_name || 'N/A');
      console.log('      Created:', r.created_at);
      console.log('      Auth ID:', r.authorization_id || 'N/A');
    });
  }
} catch (error) {
  console.log('   [ERROR]', error.message);
}

// 2. Check report_authorizations table
console.log('\n2. report_authorizations table:');
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM report_authorizations').get();
  console.log('   Total records:', count.count);
  
  if (count.count > 0) {
    const samples = db.prepare('SELECT * FROM report_authorizations ORDER BY created_at DESC LIMIT 3').all();
    console.log('\n   Sample records:');
    samples.forEach((r, i) => {
      console.log('   ' + (i + 1) + '. Requester:', r.requester_id);
      console.log('      Status:', r.status || 'N/A');
      console.log('      Created:', r.created_at);
    });
  }
} catch (error) {
  console.log('   [ERROR]', error.message);
}

db.close();

console.log('\n=== Check Complete ===');
console.log('\nConclusion:');
console.log('- approval_audit_log: Audit history records (should display in frontend)');
console.log('- report_authorizations: Authorization status records (not history log)');
