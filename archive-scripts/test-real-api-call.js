const http = require('http');

console.log('=== Testing Real API Call with Authentication ===\n');

console.log('Step 1: Login to get valid token...');

const loginData = JSON.stringify({
    username: 'boss',
    password: 'boss123'
});

const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
    }
};

const loginReq = http.request(loginOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`  Login status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
            const loginResponse = JSON.parse(data);
            const token = loginResponse.token;
            console.log(`  ✅ Login successful`);
            console.log(`  Token (first 50 chars): ${token.substring(0, 50)}...`);
            
            console.log('\nStep 2: Test platform-revenue/platforms endpoint...');
            
            const testOptions = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/platform-revenue/platforms',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };
            
            const testReq = http.request(testOptions, (testRes) => {
                let testData = '';
                
                testRes.on('data', (chunk) => {
                    testData += chunk;
                });
                
                testRes.on('end', () => {
                    console.log(`  API status: ${testRes.statusCode}`);
                    console.log(`  Response: ${testData.substring(0, 200)}`);
                    
                    if (testRes.statusCode === 200) {
                        console.log('\n  ✅ API call SUCCESSFUL!');
                    } else if (testRes.statusCode === 401) {
                        console.log('\n  ❌ 401 Unauthorized - Token not accepted');
                        console.log('  This means the middleware is rejecting the token');
                    } else if (testRes.statusCode === 403) {
                        console.log('\n  ❌ 403 Forbidden - Permission denied');
                    } else {
                        console.log(`\n  ❌ Unexpected status: ${testRes.statusCode}`);
                    }
                    
                    console.log('\n=== Test Complete ===');
                });
            });
            
            testReq.on('error', (error) => {
                console.error('  ❌ API request error:', error.message);
            });
            
            testReq.end();
            
        } else {
            console.log(`  ❌ Login failed with status ${res.statusCode}`);
            console.log(`  Response: ${data}`);
        }
    });
});

loginReq.on('error', (error) => {
    console.error('  ❌ Login request error:', error.message);
});

loginReq.write(loginData);
loginReq.end();
