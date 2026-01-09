const https = require('https');

const users = [
  { username: 'canris', password: '1234' },
  { username: '123', password: '1234' },
  { username: '1234', password: '1234' },
  { username: '111', password: '1234' }
];

function testLogin(user) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(user);
    
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
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log(`用戶: ${user.username}, 狀態: ${res.statusCode}, 回應: ${body}`);
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.error(`用戶 ${user.username} 錯誤:`, e.message);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

async function testAll() {
  for (const user of users) {
    await testLogin(user);
  }
}

testAll();
