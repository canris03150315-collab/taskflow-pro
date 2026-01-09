const https = require('https');

const postData = JSON.stringify({
  username: 'canris',
  password: 'kico123123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  },
  rejectUnauthorized: false
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      console.log('SUCCESS: Login works!');
    } else {
      console.log('ERROR: Login failed');
    }
  });
});

req.on('error', (error) => {
  console.error('ERROR:', error.message);
});

req.write(postData);
req.end();
