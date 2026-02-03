const https = require('https');

console.log('Testing AI Assistant API with real token...\n');

// First, login to get a valid token
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
      console.log('Token obtained:', token.substring(0, 20) + '...\n');
      
      // Now test AI assistant API
      const aiOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/ai-assistant/conversations',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        },
        rejectUnauthorized: false
      };
      
      const aiReq = https.request(aiOptions, (aiRes) => {
        let aiResponse = '';
        
        aiRes.on('data', (chunk) => {
          aiResponse += chunk;
        });
        
        aiRes.on('end', () => {
          console.log('AI Assistant API status:', aiRes.statusCode);
          console.log('Response:', aiResponse);
          
          if (aiRes.statusCode === 200) {
            console.log('\n✅ SUCCESS: AI Assistant API is working!');
          } else {
            console.log('\n❌ ERROR: AI Assistant API returned', aiRes.statusCode);
          }
        });
      });
      
      aiReq.on('error', (e) => {
        console.error('AI request error:', e.message);
      });
      
      aiReq.end();
    } else {
      console.log('❌ Login failed:', loginResponse);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Login request error:', e.message);
});

loginReq.write(loginData);
loginReq.end();
