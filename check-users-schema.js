const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db', { readonly: true });

try {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  console.log('Users Table Schema:');
  console.table(tableInfo);
  
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  console.log('User Count:', userCount.count);
} catch (error) {
  console.error('Error:', error);
}
db.close();
