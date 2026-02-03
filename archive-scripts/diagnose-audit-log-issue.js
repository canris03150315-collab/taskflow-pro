const Database = require('better-sqlite3');

console.log('=== Comprehensive Audit Log Diagnosis ===\n');

const db = new Database('/app/data/taskflow.db');

// 1. Check if approval_audit_log table exists
console.log('1. Check approval_audit_log table:');
try {
  const tableInfo = db.prepare("PRAGMA table_info(approval_audit_log)").all();
  if (tableInfo.length > 0) {
    console.log('  [OK] Table exists');
    console.log('  Columns:', tableInfo.map(c => c.name).join(', '));
    
    // Count records
    const count = db.prepare('SELECT COUNT(*) as count FROM approval_audit_log').get();
    console.log(`  Total records: ${count.count}`);
    
    if (count.count > 0) {
      // Show sample records
      const samples = db.prepare('SELECT * FROM approval_audit_log ORDER BY timestamp DESC LIMIT 5').all();
      console.log('\n  Sample records:');
      samples.forEach((r, i) => {
        console.log(`    ${i + 1}. ID: ${r.id}`);
        console.log(`       Action: ${r.action}`);
        console.log(`       User: ${r.user_name} (${r.user_id})`);
        console.log(`       Timestamp: ${r.timestamp}`);
        console.log(`       Report ID: ${r.report_id || 'N/A'}`);
      });
    }
  } else {
    console.log('  [ERROR] Table does not exist');
  }
} catch (error) {
  console.log('  [ERROR]', error.message);
}

// 2. Check report_authorizations table
console.log('\n2. Check report_authorizations table:');
try {
  const tableInfo = db.prepare("PRAGMA table_info(report_authorizations)").all();
  if (tableInfo.length > 0) {
    console.log('  [OK] Table exists');
    console.log('  Columns:', tableInfo.map(c => c.name).join(', '));
    
    const count = db.prepare('SELECT COUNT(*) as count FROM report_authorizations').get();
    console.log(`  Total records: ${count.count}`);
  } else {
    console.log('  [ERROR] Table does not exist');
  }
} catch (error) {
  console.log('  [ERROR]', error.message);
}

// 3. Check all tables in database
console.log('\n3. All tables in database:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('  Tables:', tables.map(t => t.name).join(', '));

db.close();

console.log('\n=== Diagnosis Complete ===');
