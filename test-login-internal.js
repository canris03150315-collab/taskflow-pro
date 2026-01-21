const http = require('http');

console.log('=== Testing Login API (Internal) ===\n');

const postData = JSON.stringify({
  username: 'canris',
  password: 'kico123123'
});

console.log('Request body:', postData);

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
  console.log('\nStatus Code:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const json = JSON.parse(data);
      if (json.token) {
        console.log('\n✓ SUCCESS: Login successful!');
        console.log('Token:', json.token.substring(0, 20) + '...');
      } else if (json.error) {
        console.log('\n✗ FAILED:', json.error);
      }
    } catch (e) {
      console.log('\n✗ Invalid JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error('✗ Request failed:', e.message);
});

req.write(postData);
req.end();
