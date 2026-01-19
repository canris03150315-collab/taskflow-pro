const https = require('https');

console.log('=== Testing AI Assistant Complete Flow ===\n');

// Step 1: Login
const loginData = JSON.stringify({
  username: 'canris',
  password: 'canris0000'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  },
  rejectUnauthorized: false
};

console.log('Step 1: Logging in...');

const loginReq = https.request(loginOptions, (loginRes) => {
  let loginResponse = '';
  
  loginRes.on('data', (chunk) => {
    loginResponse += chunk;
  });
  
  loginRes.on('end', () => {
    console.log('Login status:', loginRes.statusCode);
    
    if (loginRes.statusCode === 200) {
      const loginResult = JSON.parse(loginResponse);
      const token = loginResult.token;
      console.log('Token obtained\n');
      
      // Step 2: Test GET /conversations
      console.log('Step 2: Getting conversations...');
      const getOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/ai-assistant/conversations',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        },
        rejectUnauthorized: false
      };
      
      const getReq = https.request(getOptions, (getRes) => {
        let getResponse = '';
        
        getRes.on('data', (chunk) => {
          getResponse += chunk;
        });
        
        getRes.on('end', () => {
          console.log('GET conversations status:', getRes.statusCode);
          if (getRes.statusCode === 200) {
            console.log('✅ GET /conversations working');
            
            // Step 3: Test POST /query
            console.log('\nStep 3: Sending test query...');
            const queryData = JSON.stringify({
              message: 'Hello, this is a test'
            });
            
            const postOptions = {
              hostname: 'localhost',
              port: 3000,
              path: '/api/ai-assistant/query',
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Content-Length': queryData.length
              },
              rejectUnauthorized: false
            };
            
            const postReq = https.request(postOptions, (postRes) => {
              let postResponse = '';
              
              postRes.on('data', (chunk) => {
                postResponse += chunk;
              });
              
              postRes.on('end', () => {
                console.log('POST query status:', postRes.statusCode);
                if (postRes.statusCode === 200) {
                  console.log('✅ POST /query working');
                  console.log('\n🎉 ALL TESTS PASSED!');
                } else {
                  console.log('❌ POST /query failed');
                  console.log('Response:', postResponse);
                }
              });
            });
            
            postReq.on('error', (e) => {
              console.error('POST request error:', e.message);
            });
            
            postReq.write(queryData);
            postReq.end();
            
          } else {
            console.log('❌ GET /conversations failed');
            console.log('Response:', getResponse);
          }
        });
      });
      
      getReq.on('error', (e) => {
        console.error('GET request error:', e.message);
      });
      
      getReq.end();
      
    } else {
      console.log('❌ Login failed:', loginResponse);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Login error:', e.message);
});

loginReq.write(loginData);
loginReq.end();
