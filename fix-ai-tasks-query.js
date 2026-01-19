const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing tasks query in AI assistant...');

// Fix the tasks query - remove priority column that doesn't exist
content = content.replace(
  /SELECT id, title, status, priority FROM tasks/g,
  'SELECT id, title, status, urgency FROM tasks'
);

fs.writeFileSync(filePath, content, 'utf8');

// Verify
const newContent = fs.readFileSync(filePath, 'utf8');
if (newContent.includes('priority FROM tasks')) {
  console.log('❌ ERROR: priority still exists');
} else if (newContent.includes('urgency FROM tasks')) {
  console.log('✅ SUCCESS: Fixed to use urgency column');
} else {
  console.log('⚠️ WARNING: Pattern not found');
}
