const http = require('http');

const postData = JSON.stringify({
  username: 'canris',
  password: '1234'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`狀態碼: ${res.statusCode}`);
  console.log(`回應標頭: ${JSON.stringify(res.headers)}`);
  
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('回應內容:', body);
  });
});

req.on('error', (e) => {
  console.error(`請求錯誤: ${e.message}`);
});

req.write(postData);
req.end();
