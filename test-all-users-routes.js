const http = require('http');

console.log('=== Testing All Users Routes ===\n');

const testLogin = {
  username: 'canris',
  password: 'kico123123'
};

let token = '';
let userId = '';
let testResults = {
  login: false,
  getAll: false,
  getById: false,
  getDepartment: false,
  updateUser: false,
  deleteUser: false
};

// Helper function to make HTTP request
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
      userId = loginResponse.user.id;
      testResults.login = true;
      console.log('   ✓ Login successful');
      console.log('   User ID:', userId);
    } else {
      console.log('   ✗ Login failed:', loginRes.statusCode);
      return;
    }
    
    // Test 2: GET /api/users (Get all users)
    console.log('\n2. Testing GET /api/users...');
    const getAllRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/users',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (getAllRes.statusCode === 200) {
      const users = JSON.parse(getAllRes.data);
      testResults.getAll = true;
      console.log('   ✓ GET /api/users successful');
      console.log('   Returned', users.length, 'users');
    } else {
      console.log('   ✗ GET /api/users failed:', getAllRes.statusCode);
    }
    
    // Test 3: GET /api/users/:id (Get user by ID)
    console.log('\n3. Testing GET /api/users/:id...');
    const getByIdRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/users/${userId}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (getByIdRes.statusCode === 200) {
      const user = JSON.parse(getByIdRes.data);
      testResults.getById = true;
      console.log('   ✓ GET /api/users/:id successful');
      console.log('   User:', user.name, '(', user.role, ')');
    } else {
      console.log('   ✗ GET /api/users/:id failed:', getByIdRes.statusCode);
    }
    
    // Test 4: GET /api/users/department/:departmentId
    console.log('\n4. Testing GET /api/users/department/:departmentId...');
    // First get user's department
    const userDept = JSON.parse(getByIdRes.data).department;
    const getDeptRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/users/department/${userDept}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (getDeptRes.statusCode === 200) {
      const deptUsers = JSON.parse(getDeptRes.data);
      testResults.getDepartment = true;
      console.log('   ✓ GET /api/users/department/:id successful');
      console.log('   Department users:', deptUsers.length);
    } else {
      console.log('   ✗ GET /api/users/department/:id failed:', getDeptRes.statusCode);
    }
    
    // Test 5: PUT /api/users/:id (Update user)
    console.log('\n5. Testing PUT /api/users/:id...');
    const updateData = JSON.stringify({ name: 'Seven' }); // Keep same name
    const updateRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/users/${userId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': updateData.length
      }
    }, updateData);
    
    if (updateRes.statusCode === 200) {
      testResults.updateUser = true;
      console.log('   ✓ PUT /api/users/:id successful');
    } else {
      console.log('   ✗ PUT /api/users/:id failed:', updateRes.statusCode);
      console.log('   Response:', updateRes.data);
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log('Login:              ', testResults.login ? '✓ PASS' : '✗ FAIL');
    console.log('GET /users:         ', testResults.getAll ? '✓ PASS' : '✗ FAIL');
    console.log('GET /users/:id:     ', testResults.getById ? '✓ PASS' : '✗ FAIL');
    console.log('GET /users/dept/:id:', testResults.getDepartment ? '✓ PASS' : '✗ FAIL');
    console.log('PUT /users/:id:     ', testResults.updateUser ? '✓ PASS' : '✗ FAIL');
    
    const passCount = Object.values(testResults).filter(r => r).length;
    const totalCount = Object.keys(testResults).length;
    
    console.log('\nTotal:', passCount, '/', totalCount, 'tests passed');
    
    if (passCount === totalCount) {
      console.log('\n✓ ALL TESTS PASSED');
      process.exit(0);
    } else {
      console.log('\n✗ SOME TESTS FAILED');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n✗ Error during testing:', error.message);
    process.exit(1);
  }
}

runTests();
