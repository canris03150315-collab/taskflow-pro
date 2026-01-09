const Database = require('./node_modules/better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('/app/data/taskflow.db');

console.log('Testing login functionality...');

// Check if canris user exists
const user = db.prepare('SELECT * FROM users WHERE username = ?').get('canris');

if (!user) {
  console.log('ERROR: User canris not found!');
  process.exit(1);
}

console.log('User found:', {
  id: user.id,
  username: user.username,
  role: user.role,
  hasPassword: !!user.password
});

// Test password
const testPassword = 'kico123123';
const isValid = bcrypt.compareSync(testPassword, user.password);

console.log('Password test result:', isValid ? 'VALID' : 'INVALID');

if (!isValid) {
  console.log('ERROR: Password does not match!');
  process.exit(1);
}

console.log('SUCCESS: Login test passed');
db.close();
