const https = require('https');

const postData = JSON.stringify({
  username: 'canris',
  password: '1234'
});

const options = {
  hostname: '165.227.147.40',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  rejectUnauthorized: false
};

const req = https.request(options, (res) => {
  console.log(`狀態碼: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('回應:', body);
  });
});

req.on('error', (e) => {
  console.error(`請求錯誤: ${e.message}`);
});

req.write(postData);
req.end();
