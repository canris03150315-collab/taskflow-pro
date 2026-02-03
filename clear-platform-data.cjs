const Database = require('better-sqlite3');

console.log('=== Clearing Platform Revenue Data ===\n');

const db = new Database('/app/data/taskflow.db');

console.log('Step 1: Count current records\n');
const before = db.prepare('SELECT COUNT(*) as count FROM platform_transactions').get();
console.log('Records before:', before.count);

console.log('\nStep 2: Delete all records\n');
db.prepare('DELETE FROM platform_transactions').run();

console.log('Step 3: Verify deletion\n');
const after = db.prepare('SELECT COUNT(*) as count FROM platform_transactions').get();
console.log('Records after:', after.count);

if (after.count === 0) {
  console.log('\n✅ SUCCESS: All records cleared');
} else {
  console.log('\n❌ ERROR: Some records remain');
}

db.close();
console.log('\n=== Complete ===');
