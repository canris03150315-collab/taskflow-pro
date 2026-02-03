const fs = require('fs');
const Database = require('better-sqlite3');

console.log('=== Diagnosing Auth Route ===\n');

// Check if auth route exists
const authPath = '/app/dist/routes/auth.js';
if (!fs.existsSync(authPath)) {
  console.log('ERROR: auth.js not found at', authPath);
  process.exit(1);
}

console.log('✓ auth.js exists');

// Check database and user
try {
  const db = new Database('/app/data/taskflow.db');
  const user = db.prepare('SELECT id, username, role FROM users WHERE username = ?').get('canris');
  
  if (!user) {
    console.log('ERROR: User canris not found in database');
    process.exit(1);
  }
  
  console.log('✓ User found:', user.username, '- Role:', user.role);
  db.close();
} catch (e) {
  console.log('ERROR: Database error:', e.message);
  process.exit(1);
}

// Test the actual login endpoint
const http = require('http');

const testLogin = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'canris',
      password: 'kico123123'
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

testLogin().then(result => {
  console.log('\n=== Login Test Result ===');
  console.log('Status:', result.status);
  console.log('Body:', result.body);
  
  try {
    const json = JSON.parse(result.body);
    if (json.token) {
      console.log('\n✓ SUCCESS: Login works!');
    } else if (json.error) {
      console.log('\n✗ FAILED:', json.error);
      console.log('Check auth.js for the actual error');
    }
  } catch (e) {
    console.log('\n✗ Invalid JSON response');
  }
}).catch(err => {
  console.log('\n✗ Request failed:', err.message);
});
