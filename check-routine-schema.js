const Database = require('better-sqlite3');

const backupDb = new Database('/app/backup_20260126.db', { readonly: true });
const schema = backupDb.prepare("PRAGMA table_info(routine_records)").all();
console.log('Columns in routine_records:');
schema.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});
backupDb.close();
