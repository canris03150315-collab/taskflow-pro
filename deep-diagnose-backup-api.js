const http = require('http');

console.log('=== Deep Diagnosis: Backup API 404 Issue ===\n');

// Test 1: Check if backend API route exists
console.log('Test 1: Check backend API route in container');
console.log('Command: docker exec taskflow-pro cat /app/dist/routes/backup.js | grep -A 5 "router.get"');
console.log('');

// Test 2: Test backend API directly
console.log('Test 2: Test backend API directly (from host)');
const options = {
  hostname: '165.227.147.40',
  port: 3001,
  path: '/api/backup/status',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    console.log('');
    
    if (res.statusCode === 404) {
      console.log('[ERROR] Backend API returns 404');
      console.log('Possible causes:');
      console.log('1. Route not added to backend');
      console.log('2. Container not restarted after adding route');
      console.log('3. Route path mismatch');
    } else if (res.statusCode === 403) {
      console.log('[INFO] Backend API exists but requires authentication');
    } else if (res.statusCode === 200) {
      console.log('[SUCCESS] Backend API is working');
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();

// Test 3: Check Netlify redirect
console.log('\nTest 3: Check Netlify redirect configuration');
console.log('Expected: /api/* -> http://165.227.147.40:3001/api/:splat');
console.log('');

// Test 4: List all routes in backup.js
console.log('Test 4: Check all routes in backup.js');
console.log('Command: docker exec taskflow-pro grep "router\\." /app/dist/routes/backup.js');
console.log('');

console.log('=== Diagnosis Script Complete ===');
console.log('');
console.log('Next steps:');
console.log('1. Run: ssh root@165.227.147.40 "docker exec taskflow-pro cat /app/dist/routes/backup.js | grep -A 5 router"');
console.log('2. Check if GET /status route exists');
console.log('3. If not exists, need to add route and restart container');
console.log('4. If exists, check if container was restarted after adding');
