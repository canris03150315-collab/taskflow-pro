const http = require('http');

console.log('=== Testing External API Access ===\n');

const options = {
  hostname: '165.227.147.40',
  port: 3001,
  path: '/api/auth/setup/check',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

console.log('Testing: http://165.227.147.40:3001/api/auth/setup/check\n');

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('\nResponse:', data);
    
    if (res.statusCode === 200) {
      console.log('\nSUCCESS: External API accessible');
    } else {
      console.log('\nERROR: External API failed');
    }
  });
});

req.on('error', (err) => {
  console.error('Request failed:', err.message);
  process.exit(1);
});

req.setTimeout(10000, () => {
  console.error('Timeout after 10 seconds');
  req.destroy();
  process.exit(1);
});

req.end();
