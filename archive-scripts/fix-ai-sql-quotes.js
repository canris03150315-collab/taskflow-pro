const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing SQL quotes in AI assistant...');

// Fix SQL: SQLite uses single quotes for string values, double quotes for identifiers
content = content.replace(
  /WHERE status != "Completed"/g,
  "WHERE status != 'Completed'"
);

fs.writeFileSync(filePath, content, 'utf8');

// Verify
const newContent = fs.readFileSync(filePath, 'utf8');
if (newContent.includes('!= "Completed"')) {
  console.log('❌ ERROR: Double quotes still exist');
} else if (newContent.includes("!= 'Completed'")) {
  console.log('✅ SUCCESS: Fixed to use single quotes');
} else {
  console.log('⚠️ WARNING: Pattern not found');
}
