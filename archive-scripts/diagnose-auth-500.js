const Database = require('better-sqlite3');

console.log('=== Diagnosing Auth 500 Error ===\n');

// 1. Test database connection
try {
  const db = new Database('/app/data/taskflow.db');
  console.log('1. Database connection: SUCCESS');
  
  // 2. Test users table query
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log('2. Users count:', result.count);
  } catch (e) {
    console.log('2. Query error:', e.message);
  }
  
  // 3. Test specific user query
  try {
    const user = db.prepare('SELECT id, username, role FROM users LIMIT 1').get();
    console.log('3. Sample user:', user ? user.username : 'NONE');
  } catch (e) {
    console.log('3. User query error:', e.message);
  }
  
  // 4. Check if db.get method works (async style)
  console.log('4. Testing async db.get pattern...');
  const mockReq = { db: { get: async (query, params) => {
    return db.prepare(query).get(...(params || []));
  }}};
  
  (async () => {
    try {
      const result = await mockReq.db.get('SELECT COUNT(*) as count FROM users');
      console.log('   Async query result:', result);
    } catch (e) {
      console.log('   Async query error:', e.message);
    }
  })();
  
  db.close();
} catch (e) {
  console.log('1. Database connection error:', e.message);
}

console.log('\n=== Checking auth.js file ===');
const fs = require('fs');
const authContent = fs.readFileSync('/app/dist/routes/auth.js', 'utf8');

// Check for specific patterns that might cause issues
const checks = [
  { name: 'Has req.db reference', pattern: /req\.db/ },
  { name: 'Has db.get method', pattern: /db\.get\(/ },
  { name: 'Has error handling', pattern: /catch.*error/ },
  { name: 'Has exports.authRoutes', pattern: /exports\.authRoutes/ }
];

checks.forEach(check => {
  const found = check.pattern.test(authContent);
  console.log(`- ${check.name}: ${found ? 'YES' : 'NO'}`);
});

console.log('\n=== Diagnosis Complete ===');
