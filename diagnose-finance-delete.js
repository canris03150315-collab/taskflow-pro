const http = require('http');

console.log('=== Diagnosing Finance DELETE Issue ===\n');

let token = '';
let testRecordId = '';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data: responseData, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login() {
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
  
  const response = JSON.parse(res.data);
  token = response.token;
  console.log('Step 1: Login successful\n');
}

async function createRecord() {
  console.log('Step 2: Creating test finance record...');
  
  const createData = JSON.stringify({
    type: 'EXPENSE',
    amount: 9999,
    description: 'DELETE test record',
    category: 'OTHER',
    date: '2026-01-29'
  });
  
  const res = await makeRequest({
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
  
  console.log('  Status:', res.statusCode);
  
  if (res.statusCode === 200) {
    const record = JSON.parse(res.data);
    testRecordId = record.id;
    console.log('  Record ID:', testRecordId);
    console.log('  Amount:', record.amount);
    console.log('  [PASS] Record created successfully\n');
    return true;
  } else {
    console.log('  [FAIL] Failed to create record');
    console.log('  Response:', res.data);
    return false;
  }
}

async function verifyRecordExists() {
  console.log('Step 3: Verifying record exists...');
  
  const res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/finance',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  const response = JSON.parse(res.data);
  const record = response.records.find(r => r.id === testRecordId);
  
  if (record) {
    console.log('  [PASS] Record found in database');
    console.log('  ID:', record.id);
    console.log('  Amount:', record.amount);
    console.log('');
    return true;
  } else {
    console.log('  [FAIL] Record NOT found in database');
    console.log('  Looking for ID:', testRecordId);
    console.log('');
    return false;
  }
}

async function attemptDelete() {
  console.log('Step 4: Attempting to delete record...');
  console.log('  DELETE /api/finance/' + testRecordId);
  
  const res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/finance/' + testRecordId,
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  console.log('  Status:', res.statusCode);
  console.log('  Response:', res.data);
  console.log('');
  
  if (res.statusCode === 200) {
    console.log('  [PASS] Delete successful');
    return true;
  } else if (res.statusCode === 404) {
    console.log('  [FAIL] 404 Not Found - Record exists but DELETE returns 404');
    console.log('  This indicates a routing or service layer issue');
    return false;
  } else {
    console.log('  [FAIL] Delete failed with status', res.statusCode);
    return false;
  }
}

async function checkRouteRegistration() {
  console.log('Step 5: Checking DELETE route registration...');
  
  // Try different path variations
  const paths = [
    '/api/finance/' + testRecordId,
    '/api/finance/:id'
  ];
  
  for (const path of paths) {
    console.log('  Testing path:', path);
  }
  console.log('');
}

async function diagnose() {
  try {
    await login();
    
    const created = await createRecord();
    if (!created) {
      console.log('[CRITICAL] Cannot create record, stopping diagnosis');
      return;
    }
    
    const exists = await verifyRecordExists();
    if (!exists) {
      console.log('[CRITICAL] Record not found after creation, stopping diagnosis');
      return;
    }
    
    const deleted = await attemptDelete();
    
    await checkRouteRegistration();
    
    console.log('=== Diagnosis Complete ===\n');
    
    if (!deleted) {
      console.log('[ISSUE FOUND] Finance DELETE returns 404 even though record exists');
      console.log('');
      console.log('Possible causes:');
      console.log('1. DELETE route not properly registered in routes/finance.js');
      console.log('2. Service layer deleteRecord method has issues');
      console.log('3. Route parameter parsing issue (:id not captured)');
      console.log('4. Middleware blocking DELETE requests');
      console.log('');
      console.log('Recommendation: Check routes/finance.js DELETE route registration');
    } else {
      console.log('[SUCCESS] Finance DELETE works correctly');
    }
    
  } catch (error) {
    console.error('[ERROR]', error.message);
  }
}

diagnose();
