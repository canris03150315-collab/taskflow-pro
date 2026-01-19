const https = require('https');

// Test AI assistant API
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai-assistant/conversations',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token'
  },
  rejectUnauthorized: false
};

console.log('Testing AI Assistant API...');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    
    if (res.statusCode === 200 || res.statusCode === 401) {
      console.log('SUCCESS: API is responding');
    } else {
      console.log('ERROR: Unexpected status code');
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
