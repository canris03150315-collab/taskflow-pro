const https = require('https');

const apiKey = 'AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI';

console.log('Testing with correct API format (same as AI Studio)...\n');

// Use the exact same format as AI Studio
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
  ],
  generationConfig: {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
    stopSequences: []
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ]
};

const data = JSON.stringify(requestBody);

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Sending request to Gemini API...');

const req = https.request(options, (res) => {
  let response = '';
  
  res.on('data', (chunk) => {
    response += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS! API is working!\n');
      
      try {
        const result = JSON.parse(response);
        if (result.candidates && result.candidates[0]) {
          const text = result.candidates[0].content.parts[0].text;
          console.log('AI Response:', text);
          console.log('\n🎉 Gemini API is fully functional!');
        }
      } catch (e) {
        console.log('Response:', response.substring(0, 500));
      }
    } else {
      console.log('❌ Failed with status:', res.statusCode);
      console.log('Response:', response.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(data);
req.end();
