const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

console.log('=== Diagnosing Login Error ===\n');

try {
  const db = new Database('/app/data/taskflow.db');
  
  // Check if user exists
  const user = db.prepare('SELECT id, username, password, role FROM users WHERE username = ?').get('canris');
  
  if (!user) {
    console.log('ERROR: User "canris" not found');
    process.exit(1);
  }
  
  console.log('User found:');
  console.log('- ID:', user.id);
  console.log('- Username:', user.username);
  console.log('- Role:', user.role);
  console.log('- Password hash length:', user.password ? user.password.length : 0);
  
  // Test password verification
  const testPassword = 'kico123123';
  console.log('\nTesting password verification...');
  
  try {
    const isValid = bcrypt.compareSync(testPassword, user.password);
    console.log('Password valid:', isValid);
    
    if (isValid) {
      console.log('\n✓ Password verification successful');
      console.log('Login should work. Check auth.js route for other issues.');
    } else {
      console.log('\n✗ Password verification failed');
      console.log('Password hash may be corrupted or incorrect');
    }
  } catch (e) {
    console.log('\n✗ Password verification error:', e.message);
    console.log('bcrypt error - hash may be invalid');
  }
  
  db.close();
} catch (error) {
  console.error('Database error:', error.message);
  process.exit(1);
}
