const http = require('http');

console.log('=== Testing Login API ===\n');

const loginData = JSON.stringify({
  username: 'canris',
  password: 'kico123123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('\nResponse:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
      
      console.log('\n=== Checking User Object ===');
      if (response.user) {
        console.log('✓ User object exists');
        console.log('User ID:', response.user.id);
        console.log('Username:', response.user.username);
        console.log('Name:', response.user.name);
        console.log('Role:', response.user.role);
        console.log('Department:', response.user.department);
      } else {
        console.log('✗ User object is missing!');
      }
      
      if (response.token) {
        console.log('\n✓ Token exists');
      } else {
        console.log('\n✗ Token is missing!');
      }
    } catch (e) {
      console.log('Raw response:', data);
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(loginData);
req.end();
