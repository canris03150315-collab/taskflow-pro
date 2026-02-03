const http = require('http');

console.log('=== Testing API Endpoint ===\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/setup/check',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Testing: GET http://localhost:3000/api/auth/setup/check\n');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
    
    if (res.statusCode === 200) {
      console.log('\n✓ API endpoint working correctly');
      process.exit(0);
    } else {
      console.log(`\n✗ API returned error status: ${res.statusCode}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('✗ Request failed:', error.message);
  process.exit(1);
});

req.end();
