const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking attendance_records table schema ===');

// Get table info
const tableInfo = db.prepare("PRAGMA table_info(attendance_records)").all();
console.log('\nColumns:');
tableInfo.forEach(col => {
  console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''}`);
});

// Check for CHECK constraints
console.log('\n=== Checking table SQL ===');
const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance_records'").get();
console.log(tableSql ? tableSql.sql : 'Table not found');

// Get sample records to see actual status values
console.log('\n=== Sample status values ===');
const samples = db.prepare("SELECT DISTINCT status FROM attendance_records LIMIT 10").all();
console.log('Distinct status values:', samples.map(r => r.status));

db.close();
