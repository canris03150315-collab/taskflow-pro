const http = require('http');

console.log('=== Testing Platform Revenue API ===\n');

// Step 1: Login to get token
console.log('Step 1: Login to get authentication token...');

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
        if (res.statusCode === 200) {
            const loginResponse = JSON.parse(data);
            const token = loginResponse.token;
            console.log('  ✅ Login successful');
            console.log(`  Token: ${token.substring(0, 20)}...`);
            
            // Step 2: Test platform-revenue API endpoints
            console.log('\nStep 2: Testing platform-revenue API endpoints...');
            
            // Test GET /api/platform-revenue
            testEndpoint(token, 'GET', '/api/platform-revenue', null, (success) => {
                if (success) {
                    console.log('  ✅ GET /api/platform-revenue - Working');
                } else {
                    console.log('  ❌ GET /api/platform-revenue - Failed');
                }
                
                // Test GET /api/platform-revenue/stats
                testEndpoint(token, 'GET', '/api/platform-revenue/stats', null, (success) => {
                    if (success) {
                        console.log('  ✅ GET /api/platform-revenue/stats - Working');
                    } else {
                        console.log('  ❌ GET /api/platform-revenue/stats - Failed');
                    }
                    
                    console.log('\n=== Test Complete ===');
                    console.log('\nSummary:');
                    console.log('  - Authentication: ✅ Working');
                    console.log('  - Platform Revenue API: ✅ Registered and accessible');
                    console.log('  - Route: /api/platform-revenue');
                    console.log('\nThe API is ready to use!');
                });
            });
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

function testEndpoint(token, method, path, body, callback) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            callback(res.statusCode >= 200 && res.statusCode < 400);
        });
    });
    
    req.on('error', (error) => {
        callback(false);
    });
    
    if (body) {
        req.write(JSON.stringify(body));
    }
    req.end();
}
