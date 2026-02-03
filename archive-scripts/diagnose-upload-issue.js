const http = require('http');
const fs = require('fs');

console.log('=== Diagnosing Platform Revenue Upload Issue ===\n');

// Step 1: Get a valid token
console.log('Step 1: Login to get valid token...');

const loginData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
});

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
        console.log(`  Login status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
            const loginResponse = JSON.parse(data);
            const token = loginResponse.token;
            console.log(`  Token obtained: ${token.substring(0, 50)}...`);
            
            // Step 2: Check route registration
            console.log('\nStep 2: Checking route registration...');
            checkRouteRegistration(token);
            
        } else {
            console.log(`  Login failed: ${data}`);
            console.log('\nTrying alternative credentials...');
            tryAlternativeLogin();
        }
    });
});

loginReq.on('error', (error) => {
    console.error('  Login request error:', error.message);
});

loginReq.write(loginData);
loginReq.end();

function tryAlternativeLogin() {
    const altCreds = [
        { username: 'boss', password: 'boss123' },
        { username: 'test', password: 'test123' }
    ];
    
    let index = 0;
    
    function tryNext() {
        if (index >= altCreds.length) {
            console.log('\nAll login attempts failed. Cannot proceed with testing.');
            return;
        }
        
        const cred = altCreds[index];
        console.log(`  Trying ${cred.username}...`);
        
        const data = JSON.stringify(cred);
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const loginResponse = JSON.parse(responseData);
                    console.log(`  Success with ${cred.username}`);
                    checkRouteRegistration(loginResponse.token);
                } else {
                    index++;
                    tryNext();
                }
            });
        });
        
        req.on('error', () => {
            index++;
            tryNext();
        });
        
        req.write(data);
        req.end();
    }
    
    tryNext();
}

function checkRouteRegistration(token) {
    console.log('\nStep 3: Testing /api/platform-revenue/parse endpoint...');
    
    const testOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/platform-revenue/parse',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    };
    
    const testReq = http.request(testOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log(`  Status: ${res.statusCode}`);
            console.log(`  Response: ${data.substring(0, 200)}`);
            
            if (res.statusCode === 401) {
                console.log('\n  Issue: 401 Unauthorized');
                console.log('  This means authentication is failing');
            } else if (res.statusCode === 404) {
                console.log('\n  Issue: 404 Not Found');
                console.log('  Route is not registered correctly');
            } else if (res.statusCode === 400) {
                console.log('\n  Route is registered and authentication works');
                console.log('  400 is expected without file upload');
            } else {
                console.log(`\n  Unexpected status: ${res.statusCode}`);
            }
            
            // Step 4: Check server.js registration
            console.log('\nStep 4: Checking server.js registration...');
            checkServerRegistration();
        });
    });
    
    testReq.on('error', (error) => {
        console.error('  Request error:', error.message);
    });
    
    testReq.end();
}

function checkServerRegistration() {
    const serverPath = '/app/dist/server.js';
    
    if (fs.existsSync(serverPath)) {
        const content = fs.readFileSync(serverPath, 'utf8');
        const hasPlatformRevenue = content.includes('platform-revenue');
        
        console.log(`  server.js contains 'platform-revenue': ${hasPlatformRevenue}`);
        
        if (hasPlatformRevenue) {
            const lines = content.split('\n');
            const relevantLines = lines.filter(line => line.includes('platform-revenue'));
            console.log('\n  Relevant lines:');
            relevantLines.forEach(line => console.log(`    ${line.trim()}`));
        }
    }
    
    console.log('\n=== Diagnosis Complete ===');
}
