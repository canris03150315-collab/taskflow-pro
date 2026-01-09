const https = require('https');

const options = {
  hostname: '165.227.147.40',
  port: 3000,
  path: '/api/health',
  method: 'GET',
  rejectUnauthorized: false  // 忽略憑證錯誤
};

const req = https.request(options, (res) => {
  console.log(`狀態碼: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    console.log('回應:', chunk.toString());
  });
});

req.on('error', (e) => {
  console.error(`請求錯誤: ${e.message}`);
});

req.end();
