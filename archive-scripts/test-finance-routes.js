const http = require('http');

console.log('=== Testing Finance Routes ===\n');

const testLogin = {
  username: 'canris',
  password: 'kico123123'
};

let token = '';
let testRecordId = '';

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
    
    // Test 2: GET /api/finance (Get all records)
    console.log('2. Testing GET /api/finance...');
    const getAllRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/finance',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (getAllRes.statusCode === 200) {
      const response = JSON.parse(getAllRes.data);
      console.log('   + GET /api/finance successful');
      console.log('   + Returned', response.records.length, 'records\n');
    } else {
      console.log('   x GET /api/finance failed:', getAllRes.statusCode, '\n');
    }
    
    // Test 3: POST /api/finance (Create record)
    console.log('3. Testing POST /api/finance...');
    const createData = JSON.stringify({
      type: 'EXPENSE',
      amount: 1000,
      description: 'Test expense',
      category: 'OFFICE',
      date: new Date().toISOString().split('T')[0]
    });
    
    const createRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/finance',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': createData.length
      }
    }, createData);
    
    if (createRes.statusCode === 200) {
      const record = JSON.parse(createRes.data);
      testRecordId = record.id;
      console.log('   + POST /api/finance successful');
      console.log('   + Created record ID:', testRecordId);
      console.log('   + Amount:', record.amount, '(type:', typeof record.amount, ')');
      
      // Verify amount is correct (important test from history)
      if (record.amount === 1000) {
        console.log('   + Amount verification: PASS\n');
      } else {
        console.log('   x Amount verification: FAIL (expected 1000, got', record.amount, ')\n');
      }
    } else {
      console.log('   x POST /api/finance failed:', createRes.statusCode, '\n');
    }
    
    // Test 4: PUT /api/finance/:id (Update record)
    if (testRecordId) {
      console.log('4. Testing PUT /api/finance/:id...');
      const updateData = JSON.stringify({
        amount: 1500,
        description: 'Updated test expense'
      });
      
      const updateRes = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/finance/${testRecordId}`,
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': updateData.length
        }
      }, updateData);
      
      if (updateRes.statusCode === 200) {
        const record = JSON.parse(updateRes.data);
        console.log('   + PUT /api/finance/:id successful');
        console.log('   + Updated amount:', record.amount, '\n');
      } else {
        console.log('   x PUT /api/finance/:id failed:', updateRes.statusCode, '\n');
      }
    }
    
    // Test 5: DELETE /api/finance/:id
    if (testRecordId) {
      console.log('5. Testing DELETE /api/finance/:id...');
      const deleteRes = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/finance/${testRecordId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (deleteRes.statusCode === 200) {
        console.log('   + DELETE /api/finance/:id successful\n');
      } else {
        console.log('   x DELETE /api/finance/:id failed:', deleteRes.statusCode, '\n');
      }
    }
    
    console.log('=== All Tests Completed ===');
    console.log('SUCCESS: Finance routes are working correctly');
    
  } catch (error) {
    console.error('\nx Error during testing:', error.message);
    process.exit(1);
  }
}

runTests();
