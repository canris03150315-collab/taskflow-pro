const http = require('http');

console.log('=== TaskFlow Pro System Health Check ===\n');

const endpoints = [
  { name: 'Auth Setup Check', path: '/api/auth/setup/check' },
  { name: 'Users List', path: '/api/users' },
  { name: 'Tasks List', path: '/api/tasks' },
  { name: 'Departments', path: '/api/departments' },
  { name: 'Attendance Records', path: '/api/attendance' },
  { name: 'Announcements', path: '/api/announcements' },
  { name: 'Suggestions', path: '/api/forum' },
  { name: 'Reports', path: '/api/reports' },
  { name: 'Memos', path: '/api/memos' },
  { name: 'Routines', path: '/api/routines' }
];

let completed = 0;
const results = [];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: endpoint.path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const status = res.statusCode;
        const success = status === 200 || status === 401;
        results.push({
          name: endpoint.name,
          status: status,
          success: success
        });
        completed++;
        resolve();
      });
    });

    req.on('error', (err) => {
      results.push({
        name: endpoint.name,
        status: 'ERROR',
        success: false,
        error: err.message
      });
      completed++;
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      results.push({
        name: endpoint.name,
        status: 'TIMEOUT',
        success: false
      });
      completed++;
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing ' + endpoints.length + ' endpoints...\n');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n=== Results ===\n');
  
  let successCount = 0;
  let failCount = 0;
  
  results.forEach(result => {
    const icon = result.success ? '[OK]' : '[FAIL]';
    const statusStr = result.status === 'ERROR' ? 'ERROR: ' + result.error : result.status;
    console.log(icon + ' ' + result.name + ': ' + statusStr);
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  });
  
  console.log('\n=== Summary ===');
  console.log('Total: ' + endpoints.length);
  console.log('Success: ' + successCount);
  console.log('Failed: ' + failCount);
  
  if (failCount === 0) {
    console.log('\nSUCCESS: All endpoints working');
  } else {
    console.log('\nWARNING: ' + failCount + ' endpoints failed');
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
