const Database = require('better-sqlite3');

console.log('=== Checking work_logs Table Schema ===\n');

// Open backup database
const backupDb = new Database('/app/backup_20260126.db', { readonly: true });

console.log('1. Backup database schema:\n');
const backupSchema = backupDb.prepare("PRAGMA table_info(work_logs)").all();
console.log('Columns in work_logs:');
backupSchema.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

backupDb.close();

// Open current database
const currentDb = new Database('/app/data/taskflow.db', { readonly: true });

console.log('\n2. Current database schema:\n');
const currentSchema = currentDb.prepare("PRAGMA table_info(work_logs)").all();
console.log('Columns in work_logs:');
currentSchema.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

currentDb.close();

console.log('\n=== Schema Check Complete ===');
