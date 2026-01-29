const http = require('http');
const https = require('https');

console.log('=== Backend API Diagnosis ===\n');

// Test 1: Check if server is listening on port 3000 (HTTPS)
console.log('Test 1: HTTPS on port 3000');
const httpsOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/setup/check',
  method: 'GET',
  rejectUnauthorized: false
};

https.get(httpsOptions, (res) => {
  console.log('HTTPS Status:', res.statusCode);
  console.log('HTTPS Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('HTTPS Response:', data);
    console.log('');
    
    // Test 2: Check if server is listening on port 3001 (HTTP)
    console.log('Test 2: HTTP on port 3001');
    const httpOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/setup/check',
      method: 'GET'
    };
    
    http.get(httpOptions, (res2) => {
      console.log('HTTP Status:', res2.statusCode);
      console.log('HTTP Headers:', JSON.stringify(res2.headers, null, 2));
      
      let data2 = '';
      res2.on('data', (chunk) => { data2 += chunk; });
      res2.on('end', () => {
        console.log('HTTP Response:', data2);
        console.log('\n=== Diagnosis Complete ===');
      });
    }).on('error', (err) => {
      console.log('HTTP Error:', err.message);
      console.log('\n=== Diagnosis Complete ===');
    });
  });
}).on('error', (err) => {
  console.log('HTTPS Error:', err.message);
  console.log('');
  
  // Still try HTTP even if HTTPS fails
  console.log('Test 2: HTTP on port 3001');
  const httpOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/setup/check',
    method: 'GET'
  };
  
  http.get(httpOptions, (res2) => {
    console.log('HTTP Status:', res2.statusCode);
    console.log('HTTP Headers:', JSON.stringify(res2.headers, null, 2));
    
    let data2 = '';
    res2.on('data', (chunk) => { data2 += chunk; });
    res2.on('end', () => {
      console.log('HTTP Response:', data2);
      console.log('\n=== Diagnosis Complete ===');
    });
  }).on('error', (err) => {
    console.log('HTTP Error:', err.message);
    console.log('\n=== Diagnosis Complete ===');
  });
});
