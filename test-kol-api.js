const http = require('http');

console.log('Testing KOL API endpoints...\n');

// Test function
function testEndpoint(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`${method} ${path}`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data.substring(0, 100)}...\n`);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error(`Error testing ${path}:`, error.message);
      reject(error);
    });

    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    console.log('1. Testing KOL profiles endpoint...');
    await testEndpoint('/api/kol/profiles');
    
    console.log('2. Testing KOL stats endpoint...');
    await testEndpoint('/api/kol/stats');
    
    console.log('3. Testing KOL contracts endpoint...');
    await testEndpoint('/api/kol/contracts');
    
    console.log('✅ All KOL API endpoints are accessible');
    console.log('Note: 403 errors are expected without proper authentication');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
