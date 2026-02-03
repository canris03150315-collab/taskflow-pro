const https = require('https');

console.log('=== Testing HTTPS API Endpoint ===\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/setup/check',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  },
  rejectUnauthorized: false
};

console.log('Testing: GET https://localhost:3000/api/auth/setup/check\n');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
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
      console.log('\nOK - API endpoint working correctly');
      process.exit(0);
    } else {
      console.log(`\nERROR - API returned status: ${res.statusCode}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('ERROR - Request failed:', error.message);
  process.exit(1);
});

req.end();
