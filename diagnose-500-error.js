const http = require('http');

console.log('=== Diagnosing /api/auth/setup/check 500 Error ===\n');

console.log('[1/2] Making direct HTTP request to container...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/setup/check',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  console.log('');
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('[2/2] Response body:');
    console.log(data);
    console.log('');
    
    if (res.statusCode === 500) {
      console.log('ERROR: Server returned 500');
      try {
        const errorData = JSON.parse(data);
        console.log('Error message:', errorData.error);
      } catch (e) {
        console.log('Could not parse error response');
      }
    } else {
      console.log('SUCCESS: Request completed');
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error.message);
  process.exit(1);
});

req.end();
