const http = require('http');
const fs = require('fs');

console.log('=== Testing Complete Upload Flow ===\n');

// Create a simple test Excel file buffer
const testExcelBuffer = Buffer.from([
  0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1
]);

console.log('Step 1: Get valid token from database...');

// Read database to get a valid user token
const dbPath = '/app/data/taskflow.db';
if (!fs.existsSync(dbPath)) {
  console.log('  ERROR: Database not found');
  process.exit(1);
}

// Try to login with known credentials
const loginData = JSON.stringify({
  username: 'canris',
  password: 'canris123'
});

const loginOptions = {
  hostname: 'localhost',
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
    console.log(`  Login status: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log(`  Token obtained`);
      testParseEndpoint(response.token);
    } else {
      console.log(`  Login failed: ${data}`);
      console.log('\n  Trying to check route directly...');
      checkRouteFile();
    }
  });
});

loginReq.on('error', (err) => {
  console.error('  Login error:', err.message);
  checkRouteFile();
});

loginReq.write(loginData);
loginReq.end();

function testParseEndpoint(token) {
  console.log('\nStep 2: Testing /parse endpoint with token...');
  
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36);
  const formData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="test.xlsx"',
    'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '',
    testExcelBuffer.toString('binary'),
    `--${boundary}--`
  ].join('\r\n');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/platform-revenue/parse',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(formData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`  Status: ${res.statusCode}`);
      console.log(`  Response: ${data.substring(0, 500)}`);
      
      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(data);
          console.log('\n  Response structure:');
          console.log(`    - hasConflicts: ${json.hasConflicts !== undefined}`);
          console.log(`    - fileName: ${json.fileName !== undefined}`);
          console.log(`    - duplicates: ${json.duplicates !== undefined}`);
          console.log(`    - newRecords: ${json.newRecords !== undefined}`);
          
          if (json.hasConflicts !== undefined && json.fileName !== undefined) {
            console.log('\n  SUCCESS: Response format is correct!');
          } else {
            console.log('\n  WARNING: Response format missing required fields');
          }
        } catch (e) {
          console.log('\n  ERROR: Response is not valid JSON');
        }
      } else {
        console.log('\n  ERROR: Request failed');
      }
    });
  });
  
  req.on('error', (err) => {
    console.error('  Request error:', err.message);
  });
  
  req.write(formData);
  req.end();
}

function checkRouteFile() {
  console.log('\nStep 3: Checking route file...');
  const routePath = '/app/dist/routes/platform-revenue.js';
  
  if (fs.existsSync(routePath)) {
    const content = fs.readFileSync(routePath, 'utf8');
    console.log('  Route file exists');
    
    const hasParseRoute = content.includes("router.post('/parse'");
    const hasAuthToken = content.includes('authenticateToken');
    const hasConflicts = content.includes('hasConflicts');
    const hasFileName = content.includes('fileName');
    
    console.log(`  - Has parse route: ${hasParseRoute}`);
    console.log(`  - Has authenticateToken: ${hasAuthToken}`);
    console.log(`  - Returns hasConflicts: ${hasConflicts}`);
    console.log(`  - Returns fileName: ${hasFileName}`);
  } else {
    console.log('  ERROR: Route file not found');
  }
}

console.log('\n=== Test Complete ===');
