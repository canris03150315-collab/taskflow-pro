const jwt = require('jsonwebtoken');
const https = require('http'); // Container uses http internally on port 3000

// Get secret from env or use default fallback from auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// User to simulate (BOSS role)
const user = {
  id: 'user-1767674479948', // We need a valid ID. I'll query it first or guess based on previous logs? 
  // Better to query the DB for canris id.
  username: 'canris',
  role: 'BOSS'
};

const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db', { readonly: true });
const userRow = db.prepare('SELECT id, username, role FROM users WHERE username = ?').get('canris');
db.close();

if (!userRow) {
    console.error('User canris not found!');
    process.exit(1);
}

const token = jwt.sign(
    { 
        id: userRow.id,
        username: userRow.username,
        role: userRow.role
    },
    JWT_SECRET,
    { expiresIn: '1h' }
);

console.log('Generated Token for:', userRow.username);

// Now test the API
const postData = JSON.stringify({
  message: 'Hello AI'
});

const options = {
  hostname: 'localhost',
  port: 3001, // Use HTTP port 3001 to avoid HTTPS issues on 3000
  path: '/api/ai-assistant/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': `Bearer ${token}`
  }
};

console.log('Sending request to /api/ai-assistant/query...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', data);
    
    // Check if we got the graceful error message
    if (res.statusCode === 200 && data.includes('AI 服務暫時無法使用')) {
        console.log('✅ Graceful fallback verified!');
    } else if (res.statusCode === 200 && data.includes('response')) {
        console.log('✅ API returned a response (maybe Key started working?)');
    } else {
        console.log('❌ Unexpected response');
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(postData);
req.end();
