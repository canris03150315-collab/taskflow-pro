const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== Showing actual code patterns ===\n');

// Find all dbCall usages with context
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('dbCall(') && !line.includes('function dbCall')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
