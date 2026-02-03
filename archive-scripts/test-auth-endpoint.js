// Direct test of auth endpoints to find 500 error cause
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Testing Auth Endpoints Directly ===\n');

// Simulate the exact flow of /auth/setup/check
console.log('1. Testing /auth/setup/check logic:');
try {
  const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('   - Users count:', result.count);
  console.log('   - needsSetup:', result.count === 0);
  console.log('   - Expected response: { needsSetup: false, userCount: 13 }');
  console.log('   - Status: OK');
} catch (error) {
  console.log('   - ERROR:', error.message);
  console.log('   - Stack:', error.stack);
}

// Simulate the exact flow of /auth/login
console.log('\n2. Testing /auth/login logic:');
try {
  const username = 'canris';
  const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (userRow) {
    console.log('   - User found:', userRow.username);
    console.log('   - User role:', userRow.role);
    console.log('   - Has password:', userRow.password ? 'YES' : 'NO');
    console.log('   - Status: OK (user exists)');
  } else {
    console.log('   - ERROR: User not found');
  }
} catch (error) {
  console.log('   - ERROR:', error.message);
  console.log('   - Stack:', error.stack);
}

// Check database encryption status
console.log('\n3. Testing database accessibility:');
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('   - Tables found:', tables.length);
  console.log('   - Table names:', tables.map(t => t.name).join(', '));
  console.log('   - Status: OK');
} catch (error) {
  console.log('   - ERROR:', error.message);
}

db.close();

// Now test if the route file itself can be loaded
console.log('\n4. Testing auth.js module loading:');
try {
  const authModule = require('/app/dist/routes/auth');
  console.log('   - Module loaded: YES');
  console.log('   - authRoutes export:', typeof authModule.authRoutes);
  console.log('   - Status: OK');
} catch (error) {
  console.log('   - ERROR:', error.message);
  console.log('   - Stack:', error.stack);
}

console.log('\n=== Diagnosis Complete ===');
