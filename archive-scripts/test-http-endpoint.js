const http = require('http');

console.log('=== Testing HTTP Endpoint on Port 3001 ===\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/setup/check',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Making request to: http://localhost:3001/api/auth/setup/check\n');

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('');
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    console.log(data);
    console.log('');
    
    if (res.statusCode === 200) {
      console.log('SUCCESS: API returned 200');
      try {
        const parsed = JSON.parse(data);
        console.log('Parsed response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Could not parse JSON');
      }
    } else if (res.statusCode === 500) {
      console.log('ERROR: API returned 500');
      try {
        const parsed = JSON.parse(data);
        console.log('Error details:', parsed.error);
      } catch (e) {
        console.log('Raw error:', data);
      }
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error.message);
  process.exit(1);
});

req.setTimeout(5000, () => {
  console.error('Request timeout');
  req.destroy();
  process.exit(1);
});

req.end();
