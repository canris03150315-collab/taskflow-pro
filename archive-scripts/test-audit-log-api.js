const https = require('https');
const http = require('http');

// Test audit log API
const testAPI = () => {
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/reports/approval/audit-log?limit=5',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response:', data);
            
            if (res.statusCode === 401) {
                console.log('\nINFO: 401 Unauthorized is expected (need auth token)');
                console.log('API route exists and is accessible!');
            } else if (res.statusCode === 200) {
                console.log('\nSUCCESS: API working!');
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('ERROR:', error.message);
    });
    
    req.end();
};

testAPI();
