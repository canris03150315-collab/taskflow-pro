const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/finance',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token-for-admin'
  }
};

console.log('Testing GET /api/finance...\n');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (Array.isArray(json)) {
        console.log('\n❌ Backend returns ARRAY directly');
        console.log('Frontend expects: { records: [] }');
      } else if (json.records) {
        console.log('\n✅ Backend returns correct format: { records: [] }');
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
