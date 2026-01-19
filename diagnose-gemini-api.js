const https = require('https');

console.log('=== Diagnosing Gemini API Configuration ===\n');

// Check environment variable
const apiKey = process.env.GEMINI_API_KEY;

console.log('1. Checking API Key:');
if (apiKey) {
  console.log(`   ✓ API Key exists: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
  console.log(`   Length: ${apiKey.length} characters`);
} else {
  console.log('   ✗ API Key NOT FOUND in environment variables');
  process.exit(1);
}

// Test API call
console.log('\n2. Testing Gemini API call...');

const testData = JSON.stringify({
  contents: [
    {
      role: 'user',
      parts: [{ text: 'Hello, this is a test' }]
    }
  ],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 100
  }
});

const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

const url = new URL(apiUrl);

const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log(`   Status: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      console.log('   ✓ Gemini API is working');
      try {
        const result = JSON.parse(responseData);
        if (result.candidates && result.candidates[0]) {
          console.log('   Response preview:', result.candidates[0].content.parts[0].text.substring(0, 50) + '...');
        }
      } catch (e) {
        console.log('   ⚠ Could not parse response:', e.message);
      }
    } else {
      console.log('   ✗ Gemini API error');
      console.log('   Response:', responseData);
    }
  });
});

req.on('error', (e) => {
  console.error('   ✗ Request error:', e.message);
});

req.write(testData);
req.end();
