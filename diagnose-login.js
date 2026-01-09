const Database = require('./node_modules/better-sqlite3');
const bcrypt = require('bcrypt');

console.log('=== Login Diagnosis ===');

try {
  const db = new Database('/app/data/taskflow.db');
  
  // 1. Check users table
  console.log('\n1. Checking users table...');
  const users = db.prepare('SELECT id, username, name, role FROM users').all();
  console.log('Users found:', users.length);
  users.forEach(u => {
    console.log(`  - ${u.username} (${u.name}) - ${u.role}`);
  });
  
  // 2. Try to find canris user
  console.log('\n2. Looking for canris user...');
  const canris = db.prepare('SELECT * FROM users WHERE username = ?').get('canris');
  if (canris) {
    console.log('Found canris:', {
      id: canris.id,
      username: canris.username,
      name: canris.name,
      role: canris.role,
      hasPassword: !!canris.password
    });
    
    // 3. Test password
    console.log('\n3. Testing password...');
    const testPassword = 'kico123123';
    bcrypt.compare(testPassword, canris.password).then(isValid => {
      console.log('Password valid:', isValid);
      
      if (!isValid) {
        console.log('\n4. Password mismatch! Resetting password...');
        bcrypt.hash(testPassword, 12).then(hash => {
          db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hash, 'canris');
          console.log('Password reset complete!');
          db.close();
        });
      } else {
        console.log('\n4. Password is correct!');
        db.close();
      }
    });
  } else {
    console.log('ERROR: canris user not found!');
    db.close();
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
}
