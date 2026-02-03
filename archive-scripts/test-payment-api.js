const http = require('http');

console.log('=== Testing Payment API Endpoints ===\n');

// 測試用的 token（需要從實際登入獲取）
const testToken = 'test-token-placeholder';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/kol${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAPIs() {
  console.log('Note: These tests will fail with 401 without valid token.');
  console.log('We are just checking if routes are registered.\n');
  
  // Test 1: Get payment stats
  console.log('1. Testing GET /payment-stats...');
  try {
    const result = await makeRequest('GET', '/payment-stats');
    console.log(`   Status: ${result.status}`);
    if (result.status === 401) {
      console.log('   ✅ Route exists (401 = needs auth, which is correct)');
    } else {
      console.log(`   Response: ${JSON.stringify(result.data)}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test 2: Get KOL profiles (existing route, should work)
  console.log('\n2. Testing GET /profiles (existing route)...');
  try {
    const result = await makeRequest('GET', '/profiles');
    console.log(`   Status: ${result.status}`);
    if (result.status === 401) {
      console.log('   ✅ Route exists (needs auth)');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('\n=== Test Complete ===');
  console.log('If routes return 401 (Unauthorized), it means routes are registered correctly.');
  console.log('If routes return 404, it means routes are not found.');
}

testAPIs().catch(console.error);
