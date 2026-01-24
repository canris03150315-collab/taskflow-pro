const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/setup/check',
  method: 'GET'
};

console.log('Testing /api/auth/setup/check endpoint...\n');

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error.message);
});

req.end();
