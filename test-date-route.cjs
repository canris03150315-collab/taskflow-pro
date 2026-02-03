const http = require('http');

console.log('=== Testing /stats/date Route ===\n');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTE3Njc0NDk5MTQ3NjciLCJ1c2VybmFtZSI6ImNhbnJpcyIsInJvbGUiOiJCT1NTIiwiaWF0IjoxNzY5OTQ4NjYzLCJleHAiOjE3NzAwMzUwNjN9.FqNKxNiW67hm_pjTqz7Ql_Wd8KYWY61qmnuaZyNXwec';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/platform-revenue/stats/date?startDate=2026-01-31&endDate=2026-02-01',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.success && json.stats) {
        console.log('\nStats count:', json.stats.length);
        if (json.stats.length > 0) {
          console.log('\nFirst stat:');
          console.log(JSON.stringify(json.stats[0], null, 2));
        }
      }
    } catch (error) {
      console.log('Raw body:', body);
      console.log('Parse error:', error.message);
    }
    
    console.log('\n=== Test Complete ===');
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();
