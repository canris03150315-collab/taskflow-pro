const http = require('http');

console.log('=== Deep Check All Changes Made Today ===\n');

let token = '';
const results = {
  passed: [],
  failed: [],
  warnings: []
};

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

async function testLogin() {
  console.log('1. Testing Login...');
  const loginData = JSON.stringify({
    username: 'canris',
    password: 'kico123123'
  });
  
  const res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  }, loginData);
  
  if (res.statusCode === 200) {
    const response = JSON.parse(res.data);
    token = response.token;
    
    if (!response.user) {
      results.failed.push('Login: Missing user object');
      return false;
    }
    if (!response.user.role) {
      results.failed.push('Login: Missing user.role');
      return false;
    }
    
    results.passed.push('Login: Returns complete user info');
    console.log('   [PASS] Login successful with user info\n');
    return true;
  } else {
    results.failed.push('Login: Failed with status ' + res.statusCode);
    return false;
  }
}

async function testUsersAPI() {
  console.log('2. Testing Users API (Refactored)...');
  
  // Test GET /api/users
  const getAllRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/users',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (getAllRes.statusCode === 200) {
    const users = JSON.parse(getAllRes.data);
    if (Array.isArray(users) && users.length > 0) {
      results.passed.push('Users GET /: Returns user list');
      console.log('   [PASS] GET /api/users - ' + users.length + ' users');
    } else {
      results.warnings.push('Users GET /: Empty or invalid response');
      console.log('   [WARN] GET /api/users - Empty response');
    }
  } else {
    results.failed.push('Users GET /: Failed with status ' + getAllRes.statusCode);
    console.log('   [FAIL] GET /api/users - Status ' + getAllRes.statusCode);
  }
  
  // Test GET /api/users/:id
  const getByIdRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/users/admin-1767449914767',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (getByIdRes.statusCode === 200) {
    const user = JSON.parse(getByIdRes.data);
    if (user && user.id) {
      results.passed.push('Users GET /:id: Returns user details');
      console.log('   [PASS] GET /api/users/:id');
    } else {
      results.failed.push('Users GET /:id: Invalid response');
      console.log('   [FAIL] GET /api/users/:id - Invalid response');
    }
  } else {
    results.failed.push('Users GET /:id: Failed with status ' + getByIdRes.statusCode);
    console.log('   [FAIL] GET /api/users/:id - Status ' + getByIdRes.statusCode);
  }
  
  console.log('');
}

async function testFinanceAPI() {
  console.log('3. Testing Finance API (Refactored)...');
  
  // Test GET /api/finance
  const getAllRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/finance',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (getAllRes.statusCode === 200) {
    const response = JSON.parse(getAllRes.data);
    if (response.records && Array.isArray(response.records)) {
      results.passed.push('Finance GET /: Returns records list');
      console.log('   [PASS] GET /api/finance - ' + response.records.length + ' records');
    } else {
      results.failed.push('Finance GET /: Invalid response format');
      console.log('   [FAIL] GET /api/finance - Invalid format');
    }
  } else {
    results.failed.push('Finance GET /: Failed with status ' + getAllRes.statusCode);
    console.log('   [FAIL] GET /api/finance - Status ' + getAllRes.statusCode);
  }
  
  // Test POST /api/finance (Create)
  const createData = JSON.stringify({
    type: 'EXPENSE',
    amount: 1000,
    description: 'Deep check test',
    category: 'OTHER',
    date: '2026-01-29'
  });
  
  const createRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/finance',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Content-Length': createData.length
    }
  }, createData);
  
  if (createRes.statusCode === 200) {
    const record = JSON.parse(createRes.data);
    if (record && record.id && record.amount === 1000) {
      results.passed.push('Finance POST /: Creates record correctly');
      console.log('   [PASS] POST /api/finance - Amount verified: ' + record.amount);
      
      // Test PUT /api/finance/:id (Update)
      const updateData = JSON.stringify({
        amount: 1500,
        description: 'Updated test'
      });
      
      const updateRes = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/finance/' + record.id,
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Content-Length': updateData.length
        }
      }, updateData);
      
      if (updateRes.statusCode === 200) {
        const updated = JSON.parse(updateRes.data);
        if (updated.amount === 1500) {
          results.passed.push('Finance PUT /:id: Updates correctly');
          console.log('   [PASS] PUT /api/finance/:id - Amount updated: ' + updated.amount);
        } else {
          results.failed.push('Finance PUT /:id: Amount not updated correctly');
          console.log('   [FAIL] PUT /api/finance/:id - Amount mismatch');
        }
      } else {
        results.failed.push('Finance PUT /:id: Failed with status ' + updateRes.statusCode);
        console.log('   [FAIL] PUT /api/finance/:id - Status ' + updateRes.statusCode);
      }
      
      // Test DELETE /api/finance/:id
      const deleteRes = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/finance/' + record.id,
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      
      if (deleteRes.statusCode === 200) {
        results.passed.push('Finance DELETE /:id: Deletes correctly');
        console.log('   [PASS] DELETE /api/finance/:id');
      } else {
        results.failed.push('Finance DELETE /:id: Failed with status ' + deleteRes.statusCode);
        console.log('   [FAIL] DELETE /api/finance/:id - Status ' + deleteRes.statusCode);
      }
    } else {
      results.failed.push('Finance POST /: Invalid response or amount mismatch');
      console.log('   [FAIL] POST /api/finance - Invalid response');
    }
  } else {
    results.failed.push('Finance POST /: Failed with status ' + createRes.statusCode);
    console.log('   [FAIL] POST /api/finance - Status ' + createRes.statusCode);
  }
  
  console.log('');
}

async function testLeavesAPI() {
  console.log('4. Testing Leaves API (Delete Permission)...');
  
  // Test GET /api/leaves
  const getAllRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/leaves',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (getAllRes.statusCode === 200) {
    const leaves = JSON.parse(getAllRes.data);
    results.passed.push('Leaves GET /: Returns leave list');
    console.log('   [PASS] GET /api/leaves - ' + leaves.length + ' leaves');
    
    // Create a test leave
    const createData = JSON.stringify({
      leave_type: 'ANNUAL',
      start_date: '2026-02-10',
      end_date: '2026-02-12',
      start_period: 'FULL',
      end_period: 'FULL',
      days: 3,
      reason: 'Deep check test'
    });
    
    const createRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/leaves',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': createData.length
      }
    }, createData);
    
    if (createRes.statusCode === 200) {
      const leave = JSON.parse(createRes.data);
      console.log('   [PASS] POST /api/leaves - Created leave: ' + leave.id);
      
      // Test DELETE with BOSS permission
      const deleteRes = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/leaves/' + leave.id,
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      
      if (deleteRes.statusCode === 200) {
        results.passed.push('Leaves DELETE: BOSS can delete (new permission)');
        console.log('   [PASS] DELETE /api/leaves/:id - BOSS permission works');
      } else {
        results.failed.push('Leaves DELETE: BOSS cannot delete (permission issue)');
        console.log('   [FAIL] DELETE /api/leaves/:id - Status ' + deleteRes.statusCode);
      }
    }
  } else {
    results.failed.push('Leaves GET /: Failed with status ' + getAllRes.statusCode);
    console.log('   [FAIL] GET /api/leaves - Status ' + getAllRes.statusCode);
  }
  
  console.log('');
}

async function testSchedulesAPI() {
  console.log('5. Testing Schedules API (Delete Permission)...');
  
  // Test GET /api/schedules
  const getAllRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/schedules',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (getAllRes.statusCode === 200) {
    const schedules = JSON.parse(getAllRes.data);
    results.passed.push('Schedules GET /: Returns schedule list');
    console.log('   [PASS] GET /api/schedules - ' + schedules.length + ' schedules');
    
    // Check if there are any APPROVED schedules
    const approvedSchedules = schedules.filter(s => s.status === 'APPROVED');
    if (approvedSchedules.length > 0) {
      console.log('   [INFO] Found ' + approvedSchedules.length + ' APPROVED schedules');
      results.passed.push('Schedules: APPROVED schedules exist for testing');
    } else {
      results.warnings.push('Schedules: No APPROVED schedules to test delete');
      console.log('   [WARN] No APPROVED schedules found');
    }
  } else {
    results.failed.push('Schedules GET /: Failed with status ' + getAllRes.statusCode);
    console.log('   [FAIL] GET /api/schedules - Status ' + getAllRes.statusCode);
  }
  
  console.log('');
}

async function runTests() {
  try {
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.log('\n[CRITICAL] Login failed, cannot continue tests\n');
      return;
    }
    
    await testUsersAPI();
    await testFinanceAPI();
    await testLeavesAPI();
    await testSchedulesAPI();
    
    console.log('=== Test Results Summary ===\n');
    
    console.log('PASSED (' + results.passed.length + '):');
    results.passed.forEach(p => console.log('  [PASS] ' + p));
    
    if (results.warnings.length > 0) {
      console.log('\nWARNINGS (' + results.warnings.length + '):');
      results.warnings.forEach(w => console.log('  [WARN] ' + w));
    }
    
    if (results.failed.length > 0) {
      console.log('\nFAILED (' + results.failed.length + '):');
      results.failed.forEach(f => console.log('  [FAIL] ' + f));
      console.log('\n[CRITICAL] Some tests failed! Please investigate.');
    } else {
      console.log('\n[SUCCESS] All tests passed!');
    }
    
    console.log('\nTotal: ' + results.passed.length + ' passed, ' + 
                results.warnings.length + ' warnings, ' + 
                results.failed.length + ' failed');
    
  } catch (error) {
    console.error('\n[ERROR] Test execution failed:', error.message);
  }
}

runTests();
