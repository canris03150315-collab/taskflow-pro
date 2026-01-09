const http = require('http');

const postData = JSON.stringify({
    username: 'canris',
    password: 'kico123123'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Sending login request...');

const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response body:', data);
        if (res.statusCode === 200) {
            console.log('SUCCESS: Login OK');
        } else {
            console.log('FAILED: Login failed with status', res.statusCode);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e.message);
});

req.write(postData);
req.end();
