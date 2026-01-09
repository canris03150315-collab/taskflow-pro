const http = require('http');

const testData = JSON.stringify({
  max_concurrent_leaves: 2,
  min_on_duty_staff: 3,
  min_advance_days: 3
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/schedules/rules/Management',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length,
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(testData);
req.end();
