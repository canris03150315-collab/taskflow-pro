const Database = require('better-sqlite3');
const path = require('path');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath, { readonly: true });

try {
  const users = db.prepare("SELECT id, username, name, role FROM users WHERE role = 'BOSS'").all();
  console.log('BOSS Users:');
  users.forEach(u => {
    console.log(`- ${u.username} (${u.name})`);
  });
} catch (err) {
  console.error('Error querying database:', err.message);
} finally {
  db.close();
}
