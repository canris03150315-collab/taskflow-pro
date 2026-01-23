const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing routine toggle route...');

// 修正第一個 toggle 路由的錯誤邏輯
const oldCode = `let completedItems = JSON.parse(record.completed_items || '[]');
    completedItems[index] = isCompleted;`;

const newCode = `let completedItems = JSON.parse(record.completed_items || '[]');
    if (completedItems[index] && typeof completedItems[index] === 'object') {
      completedItems[index].completed = isCompleted;
    } else {
      completedItems[index] = isCompleted;
    }`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Fixed toggle route to preserve item structure');
} else {
  console.log('ERROR: Could not find the code to replace');
  console.log('Looking for:', oldCode);
}
