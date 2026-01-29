const http = require('http');

console.log('=== Testing Backup API ===\n');

// Get a valid token first
console.log('Step 1: Login to get valid token');

const loginData = JSON.stringify({
  username: 'canris',
  password: 'kico123123'
});

const loginOptions = {
  hostname: '165.227.147.40',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Login Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      const token = response.token;
      console.log('Token obtained:', token.substring(0, 20) + '...');
      console.log('');
      
      // Step 2: Test backup API with valid token
      console.log('Step 2: Test /api/backup/status with valid token');
      
      const backupOptions = {
        hostname: '165.227.147.40',
        port: 3001,
        path: '/api/backup/status',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      };
      
      const backupReq = http.request(backupOptions, (backupRes) => {
        console.log('Backup API Status:', backupRes.statusCode);
        console.log('Headers:', JSON.stringify(backupRes.headers, null, 2));
        
        let backupData = '';
        backupRes.on('data', (chunk) => { backupData += chunk; });
        backupRes.on('end', () => {
          console.log('Response:', backupData);
          console.log('');
          
          if (backupRes.statusCode === 404) {
            console.log('[CRITICAL] Backend API returns 404!');
            console.log('');
            console.log('Possible causes:');
            console.log('1. Route added but container not restarted');
            console.log('2. Route path mismatch (check if /status vs /backup/status)');
            console.log('3. Route not properly registered with Express app');
          } else if (backupRes.statusCode === 403) {
            console.log('[ERROR] Permission denied - user role not BOSS');
          } else if (backupRes.statusCode === 200) {
            console.log('[SUCCESS] Backup API is working!');
            const result = JSON.parse(backupData);
            console.log('Total backups:', result.totalBackups);
            console.log('Status:', result.status);
          }
        });
      });
      
      backupReq.on('error', (e) => {
        console.error('Backup API error:', e.message);
      });
      
      backupReq.end();
      
    } else {
      console.log('[ERROR] Login failed');
      console.log('Response:', data);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Login error:', e.message);
});

loginReq.write(loginData);
loginReq.end();
