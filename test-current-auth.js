const http = require('http');

console.log('=== Testing Current Auth Endpoint ===\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/setup/check',
  method: 'GET'
};

console.log('Testing: http://localhost:3001/api/auth/setup/check\n');

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      console.log('\nSUCCESS: API working');
    } else {
      console.log('\nERROR: API failed');
      try {
        const parsed = JSON.parse(data);
        console.log('Error message:', parsed.error);
      } catch (e) {}
    }
  });
});

req.on('error', (err) => {
  console.error('Request failed:', err.message);
  process.exit(1);
});

req.setTimeout(5000, () => {
  console.error('Timeout');
  req.destroy();
  process.exit(1);
});

req.end();
