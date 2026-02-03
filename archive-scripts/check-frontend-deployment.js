const https = require('https');

console.log('=== Checking Frontend Deployment ===\n');

const options = {
    hostname: 'transcendent-basbousa-6df2d2.netlify.app',
    port: 443,
    path: '/assets/',
    method: 'GET'
};

console.log('Checking if new frontend is deployed...');
console.log('Deploy ID should be: 697f6401c4c1ac78aef26a35');

const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Headers:', res.headers);
    
    if (res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302) {
        console.log('\nFrontend is accessible');
    }
});

req.on('error', (error) => {
    console.error('Error:', error.message);
});

req.end();

console.log('\n=== Diagnosis ===');
console.log('The issue is likely:');
console.log('1. Browser cache - user needs to clear cache (Ctrl+Shift+R)');
console.log('2. Token authentication - check browser console for errors');
console.log('3. API endpoint issue - check network tab in browser');
