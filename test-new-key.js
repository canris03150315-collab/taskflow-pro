const https = require('https');

const apiKey = 'AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI';

console.log('Testing NEW API Key...\n');

const data = JSON.stringify({
  contents: [{
    parts: [{ text: 'Say hello' }]
  }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
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
    console.log('Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      console.log('✅ NEW API KEY WORKS!');
      const result = JSON.parse(response);
      console.log('Response:', result.candidates[0].content.parts[0].text);
    } else {
      console.log('❌ Failed');
      console.log('Response:', response.substring(0, 300));
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
