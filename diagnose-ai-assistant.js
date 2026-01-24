const Database = require('better-sqlite3');
const fetch = require('node-fetch');

const db = new Database('/app/data/taskflow.db');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Get system context
const users = db.prepare('SELECT * FROM users LIMIT 5').all();
const departments = db.prepare('SELECT * FROM departments').all();
const tasks = db.prepare('SELECT * FROM tasks LIMIT 5').all();

console.log('Users count:', users.length);
console.log('Departments count:', departments.length);
console.log('Tasks count:', tasks.length);

// Build a simple system prompt
const systemPrompt = `You are an AI assistant for a company management system.
Current users: ${users.length}
Current departments: ${departments.length}
Current tasks: ${tasks.length}`;

console.log('\nSystem prompt length:', systemPrompt.length);
console.log('System prompt:', systemPrompt);

// Test API call
async function testAPI() {
  try {
    console.log('\n=== Testing Gemini API ===');
    
    const requestBody = {
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: '你好' }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    };
    
    console.log('Request body size:', JSON.stringify(requestBody).length);
    
    const response = await fetch(GEMINI_API_URL + '?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('SUCCESS: API call succeeded');
      if (data.candidates && data.candidates[0]) {
        console.log('AI Response:', data.candidates[0].content.parts[0].text.substring(0, 200));
      }
    } else {
      console.log('ERROR: API call failed');
      console.log('Error details:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Exception:', error.message);
  }
}

testAPI().then(() => {
  db.close();
  console.log('\nDiagnosis complete');
});
