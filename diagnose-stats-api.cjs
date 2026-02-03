const http = require('http');

console.log('=== Diagnosing Stats API Response ===\n');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTE3Njc0NDk5MTQ3NjciLCJ1c2VybmFtZSI6ImNhbnJpcyIsInJvbGUiOiJCT1NTIiwiaWF0IjoxNzY5OTQ4NjYzLCJleHAiOjE3NzAwMzUwNjN9.FqNKxNiW67hm_pjTqz7Ql_Wd8KYWY61qmnuaZyNXwec';

console.log('Step 1: Testing /api/platform-revenue/stats/platform\n');

const options1 = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/platform-revenue/stats/platform',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req1 = http.request(options1, (res) => {
  console.log('Status:', res.statusCode);
  
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('\nResponse:');
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.success && json.stats) {
        console.log('\nStats array length:', json.stats.length);
        if (json.stats.length > 0) {
          console.log('\nFirst stat object:');
          const first = json.stats[0];
          console.log('Keys:', Object.keys(first));
          console.log('Values:');
          Object.entries(first).forEach(([key, value]) => {
            console.log(`  ${key}: ${value} (type: ${typeof value})`);
          });
        }
      }
    } catch (error) {
      console.log('Raw body:', body);
      console.log('Parse error:', error.message);
    }
    
    console.log('\n\nStep 2: Testing /api/platform-revenue/platforms\n');
    
    const options2 = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/platform-revenue/platforms',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const req2 = http.request(options2, (res2) => {
      console.log('Status:', res2.statusCode);
      
      let body2 = '';
      res2.on('data', (chunk) => { body2 += chunk; });
      res2.on('end', () => {
        console.log('\nResponse:');
        try {
          const json2 = JSON.parse(body2);
          console.log(JSON.stringify(json2, null, 2));
        } catch (error) {
          console.log('Raw body:', body2);
          console.log('Parse error:', error.message);
        }
        
        console.log('\n=== Diagnosis Complete ===');
      });
    });
    
    req2.on('error', (error) => {
      console.error('Request error:', error.message);
    });
    
    req2.end();
  });
});

req1.on('error', (error) => {
  console.error('Request error:', error.message);
});

req1.end();
