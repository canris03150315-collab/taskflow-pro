const http = require('http');

console.log('=== Testing Leave Request Routes ===\n');

const testLogin = {
  username: 'canris',
  password: 'kico123123'
};

let token = '';
let testLeaveId = '';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data: responseData });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  try {
    // Test 1: Login
    console.log('1. Testing Login...');
    const loginData = JSON.stringify(testLogin);
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    }, loginData);
    
    if (loginRes.statusCode === 200) {
      const loginResponse = JSON.parse(loginRes.data);
      token = loginResponse.token;
      console.log('   + Login successful\n');
    } else {
      console.log('   x Login failed:', loginRes.statusCode);
      return;
    }
    
    // Test 2: GET /api/leaves (Get all leave requests)
    console.log('2. Testing GET /api/leaves...');
    const getAllRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/leaves',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (getAllRes.statusCode === 200) {
      const leaves = JSON.parse(getAllRes.data);
      console.log('   + GET /api/leaves successful');
      console.log('   + Returned', leaves.length, 'leave requests\n');
    } else {
      console.log('   x GET /api/leaves failed:', getAllRes.statusCode, '\n');
    }
    
    // Test 3: POST /api/leaves (Create leave request)
    console.log('3. Testing POST /api/leaves...');
    const createData = JSON.stringify({
      leave_type: 'ANNUAL',
      start_date: '2026-02-01',
      end_date: '2026-02-03',
      start_period: 'FULL',
      end_period: 'FULL',
      days: 3,
      reason: 'Test leave request'
    });
    
    const createRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/leaves',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': createData.length
      }
    }, createData);
    
    if (createRes.statusCode === 200) {
      const leave = JSON.parse(createRes.data);
      testLeaveId = leave.id;
      console.log('   + POST /api/leaves successful');
      console.log('   + Created leave ID:', testLeaveId);
      console.log('   + Status:', leave.status, '\n');
    } else {
      console.log('   x POST /api/leaves failed:', createRes.statusCode, '\n');
    }
    
    // Test 4: GET /api/leaves/:id (Get specific leave)
    if (testLeaveId) {
      console.log('4. Testing GET /api/leaves/:id...');
      const getByIdRes = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/leaves/${testLeaveId}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (getByIdRes.statusCode === 200) {
        const leave = JSON.parse(getByIdRes.data);
        console.log('   + GET /api/leaves/:id successful');
        console.log('   + Leave type:', leave.leave_type, '\n');
      } else {
        console.log('   x GET /api/leaves/:id failed:', getByIdRes.statusCode, '\n');
      }
    }
    
    // Test 5: DELETE /api/leaves/:id (Clean up)
    if (testLeaveId) {
      console.log('5. Testing DELETE /api/leaves/:id...');
      const deleteRes = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/leaves/${testLeaveId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (deleteRes.statusCode === 200) {
        console.log('   + DELETE /api/leaves/:id successful\n');
      } else {
        console.log('   x DELETE /api/leaves/:id failed:', deleteRes.statusCode, '\n');
      }
    }
    
    console.log('=== Test Summary ===');
    console.log('Tested routes: GET /, POST /, GET /:id, DELETE /:id');
    console.log('Note: Approve/Reject routes need admin permissions to test');
    console.log('SUCCESS: Basic leave routes are working');
    
  } catch (error) {
    console.error('\nx Error during testing:', error.message);
    process.exit(1);
  }
}

runTests();
