const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

console.log('Testing Gemini API with fetch...');
console.log('API Key present:', !!apiKey);
console.log('URL:', url.replace(apiKey, 'HIDDEN'));

const data = {
  contents: [{
    parts: [{ text: "Hello, answer in one word: Success" }]
  }]
};

async function testApi() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log('Status:', response.status);
    const result = await response.json();
    
    if (response.ok) {
        console.log('Success!');
        console.log('Response:', JSON.stringify(result, null, 2));
    } else {
        console.error('Error:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Exception:', error);
  }
}

testApi();
