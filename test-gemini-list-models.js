const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log('Testing Gemini API - List Models...');
console.log('API Key present:', !!apiKey);

async function listModels() {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    const result = await response.json();
    
    if (response.ok) {
        console.log('Success! API Key is valid.');
        console.log('Available models (first 5):');
        if (result.models) {
            result.models.slice(0, 5).forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log('No models field in response');
        }
    } else {
        console.error('Error:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Exception:', error);
  }
}

listModels();
