const http = require('http');

// Test audit log API with a simpler approach
const testAPI = () => {
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/reports/approval/audit-log?action=ALL&limit=5',
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
                console.log('\n✓ 401 Unauthorized (expected, need auth token)');
                console.log('✓ API route is accessible');
            } else if (res.statusCode === 200) {
                console.log('\n✅ SUCCESS: API working perfectly!');
                const parsed = JSON.parse(data);
                console.log('Logs count:', parsed.logs ? parsed.logs.length : 0);
                console.log('Total:', parsed.total);
            } else if (res.statusCode === 500) {
                console.log('\n❌ ERROR: Still getting 500 error');
                console.log('Need to check logs again');
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Request ERROR:', error.message);
    });
    
    req.end();
};

console.log('Testing audit log API...\n');
testAPI();
