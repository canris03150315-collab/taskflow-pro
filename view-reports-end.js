const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
const content = fs.readFileSync(filePath, 'utf8');

// 顯示最後 50 行
const lines = content.split('\n');
console.log('=== reports.js 最後 50 行 ===');
lines.slice(-50).forEach((line, idx) => {
    console.log(`${lines.length - 50 + idx}: ${line}`);
});
