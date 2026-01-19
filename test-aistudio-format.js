const https = require('https');

const apiKey = 'AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI';

console.log('Testing with AI Studio format...\n');

// Use simpler format first (remove tools and thinkingConfig)
const requestBody = {
  contents: [
    {
      role: 'user',
      parts: [
        {
          text: '測試'
        }
      ]
    }
  ]
};

const data = JSON.stringify(requestBody);

// Try different model names
const models = [
  'gemini-1.5-flash-latest',
  'gemini-pro',
  'gemini-1.5-pro-latest'
];

function testModel(modelName, callback) {
  console.log(`Testing model: ${modelName}...`);
  
  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options, (res) => {
    let response = '';
    
    res.on('data', (chunk) => {
      response += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS with model:', modelName);
        try {
          const result = JSON.parse(response);
          if (result.candidates && result.candidates[0]) {
            console.log('Response:', result.candidates[0].content.parts[0].text);
          }
        } catch (e) {
          console.log('Response preview:', response.substring(0, 200));
        }
        console.log('\n');
        if (callback) callback();
      } else {
        console.log('❌ Failed');
        console.log('Error:', response.substring(0, 200));
        console.log('\n');
        if (callback) callback();
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
    if (callback) callback();
  });

  req.write(data);
  req.end();
}

// Test models sequentially
let index = 0;
function testNext() {
  if (index < models.length) {
    testModel(models[index], () => {
      index++;
      testNext();
    });
  } else {
    console.log('All models tested.');
  }
}

testNext();
