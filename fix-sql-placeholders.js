const fs = require('fs');

const filePath = '/app/dist/routes/platform-revenue.js';

console.log('Reading compiled file...');
let content = fs.readFileSync(filePath, 'utf8');

// 修正 INSERT 語句的問號數量（28 -> 29）
const oldSQL = ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
const newSQL = ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

if (content.includes(oldSQL)) {
  content = content.replace(oldSQL, newSQL);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ SQL statement fixed: 28 -> 29 placeholders');
} else {
  console.log('❌ Pattern not found');
  
  // 檢查當前的問號數量
  const match = content.match(/\) VALUES \((\?(?:, \?)*)\)/);
  if (match) {
    const placeholders = match[1].split(', ');
    console.log('Current placeholder count: ' + placeholders.length);
  }
}
