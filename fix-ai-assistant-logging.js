const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 Gemini API 調用前添加詳細日誌
content = content.replace(
  /\/\/ Call Gemini API\s+let aiResponse = '';/,
  `// Call Gemini API
    console.log('[AI Assistant] Calling Gemini API...');
    console.log('[AI Assistant] System prompt length:', systemPrompt.length);
    console.log('[AI Assistant] Conversation history length:', conversationHistory.length);
    console.log('[AI Assistant] User message:', message);
    let aiResponse = '';`
);

// 在錯誤處理中添加更詳細的日誌
content = content.replace(
  /if \(!response\.ok\) \{\s+console\.error\('Gemini API error status:', response\.status\);/,
  `if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error status:', response.status);
        console.error('Gemini API error body:', errorText);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added detailed logging to AI assistant');
