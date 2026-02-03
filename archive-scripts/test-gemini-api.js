const fetch = require('node-fetch');

const GEMINI_API_KEY = 'AIzaSyC6R9gl7hIepi-DhaApDD9m0p2sDpcv0hw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function testGeminiAPI() {
  try {
    console.log('Testing Gemini API...');
    
    const response = await fetch(GEMINI_API_URL + '?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: '你好' }] }
        ]
      })
    });

    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('SUCCESS: API is working');
      if (data.candidates && data.candidates[0]) {
        console.log('AI Response:', data.candidates[0].content.parts[0].text);
      }
    } else {
      console.log('ERROR: API returned error');
    }
  } catch (error) {
    console.error('Exception:', error.message);
  }
}

testGeminiAPI();
