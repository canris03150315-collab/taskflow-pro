const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== reports.js 結構檢查 ===');
console.log('文件總行數:', content.split('\n').length);
console.log('包含 module.exports:', content.includes('module.exports'));
console.log('包含 exports.default:', content.includes('exports.default'));
console.log('包含 export default:', content.includes('export default'));

// 顯示最後 20 行
const lines = content.split('\n');
console.log('\n=== 最後 20 行 ===');
console.log(lines.slice(-20).join('\n'));
