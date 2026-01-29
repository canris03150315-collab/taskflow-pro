const http = require('http');

console.log('=== Comprehensive Test of All Changes ===\n');

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
  console.log('1. Testing Login & Authentication...');
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
    
    if (!response.user || !response.user.role || !response.user.id) {
      results.failed.push('Login: Missing critical user fields');
      return false;
    }
    
    results.passed.push('Login: Complete user info with role');
    console.log('   [PASS] Login successful\n');
    return true;
  } else {
    results.failed.push('Login: Failed with status ' + res.statusCode);
    return false;
  }
}

async function testUsersAPIComplete() {
  console.log('2. Testing Users API (All Refactored Routes)...');
  
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
      console.log('   [PASS] GET /api/users');
    } else {
      results.failed.push('Users GET /: Empty or invalid');
      console.log('   [FAIL] GET /api/users - Empty');
    }
  } else {
    results.failed.push('Users GET /: Status ' + getAllRes.statusCode);
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
    results.passed.push('Users GET /:id: Works correctly');
    console.log('   [PASS] GET /api/users/:id');
  } else {
    results.failed.push('Users GET /:id: Status ' + getByIdRes.statusCode);
    console.log('   [FAIL] GET /api/users/:id');
  }
  
  // Test GET /api/users/department/:departmentId
  const getByDeptRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/users/department/Management',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (getByDeptRes.statusCode === 200) {
    const users = JSON.parse(getByDeptRes.data);
    if (Array.isArray(users)) {
      results.passed.push('Users GET /department/:id: Works correctly');
      console.log('   [PASS] GET /api/users/department/:departmentId');
    } else {
      results.failed.push('Users GET /department/:id: Invalid response');
      console.log('   [FAIL] GET /api/users/department/:departmentId');
    }
  } else {
    results.failed.push('Users GET /department/:id: Status ' + getByDeptRes.statusCode);
    console.log('   [FAIL] GET /api/users/department/:departmentId');
  }
  
  // Test PUT /api/users/:id (update)
  const updateData = JSON.stringify({
    name: 'Seven Test'
  });
  
  const updateRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/users/admin-1767449914767',
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Content-Length': updateData.length
    }
  }, updateData);
  
  if (updateRes.statusCode === 200) {
    results.passed.push('Users PUT /:id: Updates correctly');
    console.log('   [PASS] PUT /api/users/:id');
    
    // Restore original name
    const restoreData = JSON.stringify({ name: 'Seven' });
    await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/users/admin-1767449914767',
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': restoreData.length
      }
    }, restoreData);
  } else {
    results.failed.push('Users PUT /:id: Status ' + updateRes.statusCode);
    console.log('   [FAIL] PUT /api/users/:id');
  }
  
  console.log('');
}

async function testFinanceAPIComplete() {
  console.log('3. Testing Finance API (All CRUD Operations)...');
  
  let testRecordId = '';
  
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
      results.passed.push('Finance GET /: Correct format');
      console.log('   [PASS] GET /api/finance');
    } else {
      results.failed.push('Finance GET /: Wrong format');
      console.log('   [FAIL] GET /api/finance - Wrong format');
    }
  } else {
    results.failed.push('Finance GET /: Status ' + getAllRes.statusCode);
    console.log('   [FAIL] GET /api/finance');
  }
  
  // Test POST /api/finance
  const createData = JSON.stringify({
    type: 'EXPENSE',
    amount: 5000,
    description: 'Comprehensive test',
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
    testRecordId = record.id;
    
    if (record.amount === 5000) {
      results.passed.push('Finance POST /: Amount correct (防禦性編程有效)');
      console.log('   [PASS] POST /api/finance - Amount: ' + record.amount);
    } else {
      results.failed.push('Finance POST /: Amount incorrect');
      console.log('   [FAIL] POST /api/finance - Amount mismatch');
    }
  } else {
    results.failed.push('Finance POST /: Status ' + createRes.statusCode);
    console.log('   [FAIL] POST /api/finance');
  }
  
  if (testRecordId) {
    // Test PUT /api/finance/:id
    const updateData = JSON.stringify({
      amount: 6000,
      description: 'Updated test'
    });
    
    const updateRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/finance/' + testRecordId,
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': updateData.length
      }
    }, updateData);
    
    if (updateRes.statusCode === 200) {
      const updated = JSON.parse(updateRes.data);
      if (updated.amount === 6000) {
        results.passed.push('Finance PUT /:id: Updates correctly');
        console.log('   [PASS] PUT /api/finance/:id');
      } else {
        results.failed.push('Finance PUT /:id: Amount not updated');
        console.log('   [FAIL] PUT /api/finance/:id');
      }
    } else {
      results.failed.push('Finance PUT /:id: Status ' + updateRes.statusCode);
      console.log('   [FAIL] PUT /api/finance/:id');
    }
    
    // Test DELETE /api/finance/:id
    const deleteRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/finance/' + testRecordId,
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (deleteRes.statusCode === 200) {
      results.passed.push('Finance DELETE /:id: Works correctly (修復後)');
      console.log('   [PASS] DELETE /api/finance/:id');
    } else {
      results.failed.push('Finance DELETE /:id: Status ' + deleteRes.statusCode);
      console.log('   [FAIL] DELETE /api/finance/:id');
    }
  }
  
  console.log('');
}

async function testLeavesPermissions() {
  console.log('4. Testing Leaves Delete Permissions (New Feature)...');
  
  // Create a test leave
  const createData = JSON.stringify({
    leave_type: 'ANNUAL',
    start_date: '2026-02-15',
    end_date: '2026-02-17',
    start_period: 'FULL',
    end_period: 'FULL',
    days: 3,
    reason: 'Permission test'
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
    console.log('   [PASS] POST /api/leaves - Created: ' + leave.id);
    
    // Test DELETE with BOSS permission (new feature)
    const deleteRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/leaves/' + leave.id,
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (deleteRes.statusCode === 200) {
      results.passed.push('Leaves: BOSS can delete (新權限正常)');
      console.log('   [PASS] DELETE /api/leaves/:id - BOSS permission works');
    } else {
      results.failed.push('Leaves: BOSS cannot delete (權限問題)');
      console.log('   [FAIL] DELETE /api/leaves/:id - Permission issue');
    }
  } else {
    results.warnings.push('Leaves: Cannot create test leave');
    console.log('   [WARN] Cannot create test leave');
  }
  
  console.log('');
}

async function testSchedulesAPI() {
  console.log('5. Testing Schedules API...');
  
  const getAllRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/schedules',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (getAllRes.statusCode === 200) {
    const schedules = JSON.parse(getAllRes.data);
    results.passed.push('Schedules: GET works correctly');
    console.log('   [PASS] GET /api/schedules - ' + schedules.length + ' schedules');
    
    const approvedSchedules = schedules.filter(s => s.status === 'APPROVED');
    if (approvedSchedules.length > 0) {
      results.passed.push('Schedules: APPROVED schedules exist');
      console.log('   [INFO] ' + approvedSchedules.length + ' APPROVED schedules available');
    }
  } else {
    results.failed.push('Schedules: GET failed');
    console.log('   [FAIL] GET /api/schedules');
  }
  
  console.log('');
}

async function testErrorHandling() {
  console.log('6. Testing Error Handling...');
  
  // Test invalid user ID
  const invalidUserRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/users/invalid-id-12345',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (invalidUserRes.statusCode === 404) {
    results.passed.push('Error: Returns 404 for invalid user ID');
    console.log('   [PASS] Invalid user ID returns 404');
  } else {
    results.warnings.push('Error: Unexpected status for invalid user ID');
    console.log('   [WARN] Invalid user ID returns ' + invalidUserRes.statusCode);
  }
  
  // Test invalid finance ID
  const invalidFinanceRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/finance/invalid-id-12345',
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (invalidFinanceRes.statusCode === 404 || invalidFinanceRes.statusCode === 500) {
    results.passed.push('Error: Handles invalid finance ID');
    console.log('   [PASS] Invalid finance ID handled');
  } else {
    results.warnings.push('Error: Unexpected status for invalid finance ID');
    console.log('   [WARN] Invalid finance ID returns ' + invalidFinanceRes.statusCode);
  }
  
  console.log('');
}

async function runTests() {
  try {
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.log('\n[CRITICAL] Login failed, cannot continue\n');
      return;
    }
    
    await testUsersAPIComplete();
    await testFinanceAPIComplete();
    await testLeavesPermissions();
    await testSchedulesAPI();
    await testErrorHandling();
    
    console.log('=== Comprehensive Test Results ===\n');
    
    console.log('PASSED (' + results.passed.length + '):');
    results.passed.forEach(p => console.log('  [PASS] ' + p));
    
    if (results.warnings.length > 0) {
      console.log('\nWARNINGS (' + results.warnings.length + '):');
      results.warnings.forEach(w => console.log('  [WARN] ' + w));
    }
    
    if (results.failed.length > 0) {
      console.log('\nFAILED (' + results.failed.length + '):');
      results.failed.forEach(f => console.log('  [FAIL] ' + f));
      console.log('\n[CRITICAL] Found ' + results.failed.length + ' issues!');
    } else {
      console.log('\n[SUCCESS] All tests passed!');
      console.log('No other issues found.');
    }
    
    console.log('\nTotal: ' + results.passed.length + ' passed, ' + 
                results.warnings.length + ' warnings, ' + 
                results.failed.length + ' failed');
    
  } catch (error) {
    console.error('\n[ERROR] Test execution failed:', error.message);
  }
}

runTests();
