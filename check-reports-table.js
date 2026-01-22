const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking Reports Table ===\n');

// Check if table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reports'").all();
console.log('1. Reports table exists:', tables.length > 0);

if (tables.length > 0) {
  // Get table structure
  const tableInfo = db.prepare("PRAGMA table_info(reports)").all();
  console.log('\n2. Table structure:');
  tableInfo.forEach(col => {
    console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  
  // Count records
  const count = db.prepare("SELECT COUNT(*) as count FROM reports").get();
  console.log('\n3. Total records:', count.count);
  
  // Show sample data if exists
  if (count.count > 0) {
    const sample = db.prepare("SELECT * FROM reports LIMIT 3").all();
    console.log('\n4. Sample data:');
    sample.forEach((row, idx) => {
      console.log(`   Record ${idx + 1}:`, JSON.stringify(row, null, 2));
    });
  }
}

db.close();
console.log('\n=== Check Complete ===');
