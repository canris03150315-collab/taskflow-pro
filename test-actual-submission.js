const http = require('http');

// 模擬前端提交的數據
const testData = {
  date: '2026-01-03',
  amount: 10000,  // 正確的金額
  type: 'INCOME',
  status: 'PENDING',
  category: '餐費',
  description: '測試撥款',  // 文字說明
  scope: 'DEPARTMENT',
  departmentId: 'Engineering',
  recordedBy: 'admin-1767325980478'
};

console.log('=== Testing Finance POST with correct data ===\n');
console.log('Submitting data:');
console.log(JSON.stringify(testData, null, 2));

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/finance',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer dummy-token'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Status:', res.statusCode);
    console.log('Response:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.amount) {
        console.log('\n=== Verification ===');
        console.log('Submitted amount:', testData.amount);
        console.log('Returned amount:', json.amount);
        console.log('Match:', json.amount === testData.amount ? '✅' : '❌');
        
        if (json.amount !== testData.amount) {
          console.log(`\n🔴 AMOUNT MISMATCH: Expected ${testData.amount}, got ${json.amount}`);
          console.log(`Difference: ${testData.amount - json.amount}`);
        }
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(postData);
req.end();
