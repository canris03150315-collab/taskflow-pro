const http = require('http');

console.log('=== Testing /parse Endpoint with Error Capture ===\n');

// Get auth token first
const loginData = JSON.stringify({
  username: 'canris',
  password: 'Aa123456'
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

console.log('Step 1: Logging in to get token...\n');

const loginReq = http.request(loginOptions, (loginRes) => {
  let loginBody = '';
  
  loginRes.on('data', (chunk) => {
    loginBody += chunk;
  });
  
  loginRes.on('end', () => {
    try {
      const loginResult = JSON.parse(loginBody);
      
      if (!loginResult.token) {
        console.log('Login failed:', loginBody);
        return;
      }
      
      console.log('Login successful, token obtained');
      
      // Now test parse endpoint with minimal data
      console.log('\nStep 2: Testing /parse endpoint...\n');
      
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const fileContent = Buffer.from([
        0x50, 0x4B, 0x03, 0x04  // ZIP header (xlsx is a zip file)
      ]);
      
      const formData = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.xlsx"',
        'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '',
        fileContent.toString('binary'),
        `--${boundary}--`
      ].join('\r\n');
      
      const parseOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/platform-revenue/parse',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${loginResult.token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': Buffer.byteLength(formData)
        },
        rejectUnauthorized: false
      };
      
      const parseReq = http.request(parseOptions, (parseRes) => {
        let parseBody = '';
        
        console.log('Response status:', parseRes.statusCode);
        console.log('Response headers:', parseRes.headers);
        
        parseRes.on('data', (chunk) => {
          parseBody += chunk;
        });
        
        parseRes.on('end', () => {
          console.log('\nResponse body:', parseBody);
          
          if (parseRes.statusCode === 500) {
            console.log('\n❌ 500 Error confirmed');
            console.log('This indicates a server-side error in the /parse endpoint');
          }
        });
      });
      
      parseReq.on('error', (error) => {
        console.error('Request error:', error.message);
      });
      
      parseReq.write(formData);
      parseReq.end();
      
    } catch (error) {
      console.error('Error parsing login response:', error.message);
    }
  });
});

loginReq.on('error', (error) => {
  console.error('Login request error:', error.message);
});

loginReq.write(loginData);
loginReq.end();
