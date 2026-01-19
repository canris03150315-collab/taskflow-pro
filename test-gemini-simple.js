const https = require('https');

const apiKey = 'AIzaSyDN-qmvQ_7HCEPcvtjVCAKpCZCH9y_Wlc';

console.log('Testing Gemini API with simple request...\n');

const data = JSON.stringify({
  contents: [{
    parts: [{ text: 'Say hello in one word' }]
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
    console.log('Response:', response.substring(0, 500));
    
    if (res.statusCode === 200) {
      console.log('\n✅ API Key is working!');
    } else {
      console.log('\n❌ API Key failed');
      
      // Check if API needs to be enabled
      if (response.includes('API_KEY_INVALID')) {
        console.log('\n💡 Possible solutions:');
        console.log('1. Wait a few minutes for the key to activate');
        console.log('2. Enable Gemini API in Google Cloud Console');
        console.log('3. Check API restrictions in the key settings');
        console.log('4. Verify billing is enabled on the project');
      }
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
