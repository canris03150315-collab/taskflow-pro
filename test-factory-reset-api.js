const https = require('https');

// 測試恢復原廠設定 API
const testFactoryReset = () => {
    const options = {
        hostname: '165.227.147.40',
        port: 3000,
        path: '/api/system/reset-factory',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-will-fail-auth'
        },
        rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response:', data);
            
            if (res.statusCode === 401 || res.statusCode === 403) {
                console.log('\\n✅ API endpoint exists and requires authentication (expected)');
            } else if (res.statusCode === 404) {
                console.log('\\n❌ API endpoint not found');
            } else {
                console.log('\\n✅ API endpoint is working');
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error:', error.message);
    });

    req.end();
};

console.log('Testing Factory Reset API...');
testFactoryReset();
