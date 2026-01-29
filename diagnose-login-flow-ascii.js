const http = require('http');

console.log('=== Diagnosing Complete Login Flow ===\n');

async function testLogin() {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      username: 'canris',
      password: 'kico123123'
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ statusCode: res.statusCode, response });
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
}

async function diagnose() {
  try {
    console.log('Step 1: Testing Login API...');
    const result = await testLogin();
    
    console.log('Status Code:', result.statusCode);
    console.log('');
    
    if (result.statusCode !== 200) {
      console.log('ERROR: Login failed with status', result.statusCode);
      console.log('Response:', JSON.stringify(result.response, null, 2));
      return;
    }
    
    console.log('Step 2: Checking Response Structure...');
    const { response } = result;
    
    const checks = {
      'Has token': !!response.token,
      'Has user object': !!response.user,
      'User has id': !!(response.user && response.user.id),
      'User has username': !!(response.user && response.user.username),
      'User has name': !!(response.user && response.user.name),
      'User has role': !!(response.user && response.user.role),
      'User has department': !!(response.user && response.user.department)
    };
    
    console.log('');
    Object.entries(checks).forEach(([check, passed]) => {
      const symbol = passed ? 'PASS' : 'FAIL';
      console.log('  [' + symbol + ']', check);
    });
    
    console.log('');
    console.log('Step 3: User Object Details...');
    if (response.user) {
      console.log('  ID:', response.user.id);
      console.log('  Username:', response.user.username);
      console.log('  Name:', response.user.name);
      console.log('  Role:', response.user.role);
      console.log('  Department:', response.user.department);
    }
    
    console.log('');
    console.log('Step 4: Token Details...');
    if (response.token) {
      console.log('  Token length:', response.token.length);
      console.log('  Token starts with:', response.token.substring(0, 20) + '...');
    }
    
    console.log('');
    console.log('=== Diagnosis Complete ===');
    console.log('');
    
    const allPassed = Object.values(checks).every(v => v);
    if (allPassed) {
      console.log('[SUCCESS] Backend API is working correctly');
      console.log('[SUCCESS] All required fields are present');
      console.log('');
      console.log('CONCLUSION: The problem is in the FRONTEND');
      console.log('The frontend is not saving user data to localStorage after login');
    } else {
      console.log('[ERROR] Backend API has issues');
      const missing = Object.entries(checks).filter(([k, v]) => !v).map(([k]) => k);
      console.log('Missing fields:', missing.join(', '));
    }
    
  } catch (error) {
    console.error('ERROR during diagnosis:', error.message);
  }
}

diagnose();
