const http = require('http');

console.log('=== Testing AI Assistant API ===\n');

// Test 1: Get conversations
console.log('Test 1: GET /api/ai-assistant/conversations');
const options1 = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai-assistant/conversations',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token'
  }
};

const req1 = http.request(options1, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 401 || res.statusCode === 403) {
      console.log('✅ API endpoint is responding');
      console.log('Response:', data.substring(0, 100));
    } else {
      console.log('❌ Unexpected status:', res.statusCode);
      console.log('Response:', data);
    }
  });
});

req1.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
});

req1.end();
