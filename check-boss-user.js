const fs = require('fs');
const path = require('path');

console.log('Checking for BOSS users in database...\n');

const dbPath = '/app/data/taskflow.db';

try {
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);
  
  // Find BOSS users
  const users = db.prepare('SELECT id, name, username, role FROM users WHERE role = ?').all('BOSS');
  
  console.log('BOSS users found:', users.length);
  users.forEach(user => {
    console.log(`- ID: ${user.id}, Name: ${user.name}, Username: ${user.username}`);
  });
  
  db.close();
  
  if (users.length === 0) {
    console.log('\n⚠️ No BOSS users found!');
  }
  
} catch (error) {
  console.error('Error:', error.message);
}
