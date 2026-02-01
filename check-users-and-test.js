const http = require('http');

console.log('=== Checking Users and Testing API ===\n');

// First, let's try to get a token with a test user
// We'll try multiple common credentials

const credentials = [
    { username: 'admin', password: 'admin123' },
    { username: 'boss', password: 'boss123' },
    { username: 'test', password: 'test123' }
];

function tryLogin(index) {
    if (index >= credentials.length) {
        console.log('\n❌ All login attempts failed');
        console.log('The issue is that we cannot get a valid token to test');
        return;
    }
    
    const cred = credentials[index];
    console.log(`Trying login with: ${cred.username}/${cred.password}`);
    
    const loginData = JSON.stringify(cred);
    
    const loginOptions = {
        hostname: 'localhost',
        port: 3001,
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
            if (res.statusCode === 200) {
                const loginResponse = JSON.parse(data);
                const token = loginResponse.token;
                console.log(`  ✅ Login successful with ${cred.username}`);
                console.log(`  Token: ${token.substring(0, 50)}...`);
                
                // Now test the platform-revenue API
                testPlatformRevenueAPI(token);
            } else {
                console.log(`  ❌ Failed: ${data}`);
                // Try next credential
                tryLogin(index + 1);
            }
        });
    });
    
    loginReq.on('error', (error) => {
        console.error(`  ❌ Request error: ${error.message}`);
        tryLogin(index + 1);
    });
    
    loginReq.write(loginData);
    loginReq.end();
}

function testPlatformRevenueAPI(token) {
    console.log('\nTesting /api/platform-revenue/platforms...');
    
    const testOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/platform-revenue/platforms',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const testReq = http.request(testOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`  HTTP Status: ${res.statusCode}`);
            console.log(`  Response: ${data.substring(0, 200)}`);
            
            if (res.statusCode === 200) {
                console.log('\n✅ Platform Revenue API is WORKING!');
                console.log('The API endpoint is correctly registered and accessible');
            } else if (res.statusCode === 401) {
                console.log('\n❌ 401 Unauthorized');
                console.log('Token is not being accepted by the middleware');
            } else {
                console.log(`\n❌ Unexpected status: ${res.statusCode}`);
            }
            
            console.log('\n=== Test Complete ===');
        });
    });
    
    testReq.on('error', (error) => {
        console.error('❌ API request error:', error.message);
    });
    
    testReq.end();
}

// Start testing
tryLogin(0);
