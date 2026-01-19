const https = require('https');

const apiKey = 'AIzaSyDN-qmvQ_7HCEPcvtjVCAKpCZCH9y_Wlc';

console.log('Testing different Gemini API endpoints...\n');

// Test 1: List models (doesn't require generation quota)
console.log('Test 1: Listing available models...');

const listOptions = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models?key=${apiKey}`,
  method: 'GET'
};

const listReq = https.request(listOptions, (res) => {
  let response = '';
  
  res.on('data', (chunk) => {
    response += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      console.log('✅ API Key is valid for listing models\n');
      const data = JSON.parse(response);
      console.log('Available models:', data.models?.slice(0, 3).map(m => m.name).join(', '));
      
      // Test 2: Try generation
      console.log('\nTest 2: Testing generation...');
      testGeneration();
    } else {
      console.log('❌ Failed to list models');
      console.log('Response:', response);
      
      if (response.includes('API_KEY_INVALID')) {
        console.log('\n💡 The API Key itself seems invalid.');
        console.log('Possible reasons:');
        console.log('1. The key is restricted to specific APIs (check API restrictions)');
        console.log('2. The key is restricted by IP or referrer');
        console.log('3. The key needs more time to propagate (wait 5-10 minutes)');
        console.log('4. Try creating a new unrestricted key');
      }
    }
  });
});

listReq.on('error', (e) => {
  console.error('Error:', e.message);
});

listReq.end();

function testGeneration() {
  const data = JSON.stringify({
    contents: [{
      parts: [{ text: 'Hello' }]
    }]
  });

  const genOptions = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const genReq = https.request(genOptions, (res) => {
    let response = '';
    
    res.on('data', (chunk) => {
      response += chunk;
    });
    
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      
      if (res.statusCode === 200) {
        console.log('✅ Generation works!');
      } else {
        console.log('❌ Generation failed');
        console.log('Response:', response.substring(0, 300));
      }
    });
  });

  genReq.on('error', (e) => {
    console.error('Error:', e.message);
  });

  genReq.write(data);
  genReq.end();
}
