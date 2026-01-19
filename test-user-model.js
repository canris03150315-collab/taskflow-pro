const apiKey = process.env.GEMINI_API_KEY;
const modelId = "gemini-2.0-flash-exp"; // Trying a newer model that might match "gemini-3" or be the actual one meant, usually it's 1.5 or 2.0. But let's stick to what user provided first if possible, but "gemini-3" seems like a typo or very specific preview. Let's try what was in the curl: "gemini-3-flash-preview"
// Wait, "gemini-3-flash-preview" doesn't exist publicly yet. It might be "gemini-2.0-flash-exp" or user meant "gemini-1.5-flash". 
// However, I should try EXACTLY what user pasted.
const userModelId = "gemini-3-flash-preview"; 
const apiMethod = "streamGenerateContent";

// Construct URL exactly as user provided
const url = `https://generativelanguage.googleapis.com/v1beta/models/${userModelId}:${apiMethod}?key=${apiKey}`;

console.log(`Testing Gemini API with User Provided Config...`);
console.log(`Model: ${userModelId}`);
console.log(`Method: ${apiMethod}`);

const data = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Hello"
          },
        ]
      },
    ],
    generationConfig: {
      thinkingConfig: {
        thinkingLevel: "HIGH",
      },
    },
    // Removing tools for simple test
};

async function testApi() {
  try {
    // Note: streamGenerateContent returns a stream, but for a simple fetch we might get a chunked response.
    // However, we just want to see if we get a 200 OK or 400 INVALID_ARGUMENT.
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log('Status:', response.status);
    
    if (response.ok) {
        console.log('Success! The API Key works with this specific model/endpoint.');
        const text = await response.text();
        console.log('Response preview:', text.substring(0, 200));
    } else {
        const result = await response.json();
        console.error('Error:', JSON.stringify(result, null, 2));
        
        // If that fails, try a fallback to gemini-2.0-flash-exp which is current cutting edge
        if (userModelId === 'gemini-3-flash-preview') {
            console.log('\n--- Retrying with gemini-2.0-flash-exp ---');
            await testFallback('gemini-2.0-flash-exp');
        }
    }
  } catch (error) {
    console.error('Exception:', error);
  }
}

async function testFallback(fallbackModel) {
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
        });
        console.log(`Fallback (${fallbackModel}) Status:`, response.status);
        if (response.ok) console.log('Fallback Success!');
        else console.log('Fallback Error:', JSON.stringify(await response.json(), null, 2));
    } catch (e) { console.error(e); }
}

testApi();
