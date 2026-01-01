const http = require('http');

http.get('http://localhost:5000/api/version', (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log('Version:', body));
}).on('error', (e) => console.error('Error:', e.message));
