const http = require('http');

console.log('=== Testing GET /api/users ===');

// Test credentials (from WORK_LOG_CURRENT.md)
const testLogin = {
  username: 'canris',
  password: 'kico123123'
};

// Step 1: Login to get token
const loginData = JSON.stringify(testLogin);
const loginOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error('Login failed:', res.statusCode, data);
      process.exit(1);
    }
    
    const loginResponse = JSON.parse(data);
    const token = loginResponse.token;
    console.log('+ Login successful, got token');
    
    // Step 2: Test GET /api/users with token
    const getUsersOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/users',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const getUsersReq = http.request(getUsersOptions, (res) => {
      let userData = '';
      
      res.on('data', (chunk) => {
        userData += chunk;
      });
      
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        
        if (res.statusCode !== 200) {
          console.error('GET /api/users failed:', userData);
          process.exit(1);
        }
        
        const users = JSON.parse(userData);
        console.log('+ GET /api/users successful');
        console.log('+ Returned', users.length, 'users');
        console.log('+ First user:', users[0] ? users[0].name : 'none');
        console.log('SUCCESS: GET / route is working with UserService');
      });
    });
    
    getUsersReq.on('error', (e) => {
      console.error('Request error:', e.message);
      process.exit(1);
    });
    
    getUsersReq.end();
  });
});

loginReq.on('error', (e) => {
  console.error('Login error:', e.message);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
