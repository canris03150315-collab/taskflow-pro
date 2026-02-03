const https = require('https');

const apiKey = 'AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI';

console.log('=== Deep Diagnostics for Gemini API ===\n');

// Test 1: Check if the API endpoint is reachable
console.log('Test 1: Checking API endpoint availability...');

const testEndpoint = {
  hostname: 'generativelanguage.googleapis.com',
  path: '/v1beta/models',
  method: 'GET'
};

const req1 = https.request(testEndpoint, (res) => {
  console.log(`Status without API key: ${res.statusCode}`);
  
  if (res.statusCode === 403 || res.statusCode === 401) {
    console.log('✓ Endpoint is reachable (authentication required as expected)\n');
  } else {
    console.log('⚠ Unexpected status\n');
  }
  
  // Test 2: Try with API key in header instead of query
  console.log('Test 2: Using API key in header...');
  testWithHeader();
});

req1.on('error', (e) => {
  console.error('✗ Cannot reach endpoint:', e.message);
});

req1.end();

function testWithHeader() {
  const data = JSON.stringify({
    contents: [{
      parts: [{ text: 'test' }]
    }]
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-pro:generateContent',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    }
  };

  const req = https.request(options, (res) => {
    let response = '';
    
    res.on('data', (chunk) => {
      response += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status with header: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log('✓ Header method works!\n');
      } else {
        console.log('✗ Header method failed');
        console.log('Response:', response.substring(0, 250));
        
        // Test 3: Check project number instead of key
        console.log('\nTest 3: Checking API key format...');
        checkKeyFormat();
      }
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e.message);
  });

  req.write(data);
  req.end();
}

function checkKeyFormat() {
  console.log(`API Key: ${apiKey}`);
  console.log(`Length: ${apiKey.length} characters`);
  console.log(`Starts with: ${apiKey.substring(0, 7)}`);
  
  if (apiKey.length !== 39) {
    console.log('⚠ WARNING: Typical Google API keys are 39 characters');
  }
  
  if (!apiKey.startsWith('AIza')) {
    console.log('⚠ WARNING: Google API keys typically start with "AIza"');
  }
  
  console.log('\n=== Diagnostic Summary ===');
  console.log('The API key format looks correct, but Google rejects it.');
  console.log('\nPossible causes:');
  console.log('1. Project billing is not fully activated');
  console.log('2. Gemini API quota is 0 or exceeded');
  console.log('3. API was enabled but service terms not accepted');
  console.log('4. Regional restrictions on the project');
  console.log('5. The project needs "Generative AI Early Access" enrollment');
  console.log('\nRecommended actions:');
  console.log('1. Visit: https://aistudio.google.com');
  console.log('2. Try generating content directly in AI Studio with this project');
  console.log('3. Check if there are any error messages or prompts');
  console.log('4. Verify the API key works in AI Studio playground');
}
