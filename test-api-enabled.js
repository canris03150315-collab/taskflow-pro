const https = require('https');

console.log('Checking if Generative Language API is properly enabled...\n');

const apiKey = 'AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI';

// Try the v1 endpoint instead of v1beta
console.log('Test 1: Using v1 endpoint...');

const data1 = JSON.stringify({
  contents: [{
    parts: [{ text: 'Hello' }]
  }]
});

const options1 = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1/models/gemini-pro:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req1 = https.request(options1, (res) => {
  let response = '';
  
  res.on('data', (chunk) => {
    response += chunk;
  });
  
  res.on('end', () => {
    console.log('v1 Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      console.log('✅ v1 endpoint works!');
    } else {
      console.log('❌ v1 failed');
      console.log('Response:', response.substring(0, 200));
      
      // Try v1beta
      console.log('\nTest 2: Using v1beta endpoint...');
      testV1Beta();
    }
  });
});

req1.on('error', (e) => {
  console.error('Error:', e.message);
});

req1.write(data1);
req1.end();

function testV1Beta() {
  const data = JSON.stringify({
    contents: [{
      parts: [{ text: 'Hello' }]
    }]
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let response = '';
    
    res.on('data', (chunk) => {
      response += chunk;
    });
    
    res.on('end', () => {
      console.log('v1beta Status:', res.statusCode);
      
      if (res.statusCode === 200) {
        console.log('✅ v1beta endpoint works!');
      } else {
        console.log('❌ v1beta failed');
        console.log('Response:', response.substring(0, 200));
        
        console.log('\n⚠️ Both endpoints failed.');
        console.log('\nPossible issues:');
        console.log('1. New API key needs 5-10 minutes to activate');
        console.log('2. Billing account not properly linked');
        console.log('3. API quota exceeded');
        console.log('4. Region restrictions');
        console.log('\nPlease check:');
        console.log('- https://console.cloud.google.com/billing/projects');
        console.log('- https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com');
      }
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e.message);
  });

  req.write(data);
  req.end();
}
