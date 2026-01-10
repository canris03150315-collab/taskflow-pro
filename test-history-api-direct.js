const http = require('http');

console.log('=== Test /api/routines/history API directly ===\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/routines/history',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test'
  }
};

// First get a valid token
const Database = require('./node_modules/better-sqlite3');
const jwt = require('./node_modules/jsonwebtoken');
const fs = require('fs');

const db = new Database('/app/data/taskflow.db');
const dbKey = fs.readFileSync('/app/data/.db-key', 'utf8').trim();

// Get BOSS user
const boss = db.prepare('SELECT * FROM users WHERE role = ?').get('BOSS');
console.log('BOSS user:', boss.name);

// Generate token
const token = jwt.sign(
  { userId: boss.id, role: boss.role, department: boss.department },
  dbKey,
  { expiresIn: '1h' }
);

console.log('Token generated');

// Make HTTP request
const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/routines/history',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\nAPI Response Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('Records count:', json.records?.length || 0);
      if (json.records && json.records.length > 0) {
        console.log('\nFirst record:');
        console.log(JSON.stringify(json.records[0], null, 2));
      }
    } catch (e) {
      console.log('Response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();

db.close();
