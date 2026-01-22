const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
const content = fs.readFileSync(filePath, 'utf8');

// 顯示前 30 行
const lines = content.split('\n');
console.log('=== reports.js 前 30 行 ===');
lines.slice(0, 30).forEach((line, idx) => {
    console.log(`${idx}: ${line}`);
});

// 檢查是否有 approval 相關路由
console.log('\n=== 搜尋 approval 路由 ===');
const approvalLines = lines.filter((line, idx) => 
    line.includes('approval') || line.includes('/approval')
).map((line, idx) => {
    const lineNum = lines.indexOf(line);
    return `${lineNum}: ${line}`;
});
console.log(approvalLines.join('\n'));
