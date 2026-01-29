const http = require('http');

console.log('=== Testing GET /api/users/:id ===');

const testLogin = {
  username: 'canris',
  password: 'kico123123'
};

// Step 1: Login
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
    const userId = loginResponse.user.id;
    console.log('+ Login successful');
    console.log('+ User ID:', userId);
    
    // Step 2: Test GET /api/users/:id
    const getUserOptions = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/users/${userId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const getUserReq = http.request(getUserOptions, (res) => {
      let userData = '';
      
      res.on('data', (chunk) => {
        userData += chunk;
      });
      
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        
        if (res.statusCode !== 200) {
          console.error('GET /api/users/:id failed:', userData);
          process.exit(1);
        }
        
        const user = JSON.parse(userData);
        console.log('+ GET /api/users/:id successful');
        console.log('+ User name:', user.name);
        console.log('+ User role:', user.role);
        console.log('+ Has permissions:', !!user.permissions);
        console.log('SUCCESS: GET /:id route is working with UserService');
      });
    });
    
    getUserReq.on('error', (e) => {
      console.error('Request error:', e.message);
      process.exit(1);
    });
    
    getUserReq.end();
  });
});

loginReq.on('error', (e) => {
  console.error('Login error:', e.message);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
