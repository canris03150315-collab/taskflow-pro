const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Fix Report POST Route to Support Custom Date ===');

// 修復 POST 路由：支持自定義日期
const oldPattern = /const { type, content } = req\.body;\s+const id = "report-" \+ Date\.now\(\);\s+const now = new Date\(\)\.toISOString\(\);/;
const newCode = `const { type, content, createdAt } = req.body;
        const id = "report-" + Date.now();
        const now = createdAt || new Date().toISOString();`;

if (content.match(oldPattern)) {
    content = content.replace(oldPattern, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('\u2705 SUCCESS: Updated POST route to support custom date');
} else {
    console.log('\u26a0\ufe0f Pattern not found, checking alternative...');
    
    // 檢查是否已經修復
    if (content.includes('const { type, content, createdAt } = req.body')) {
        console.log('\u2705 Already fixed!');
    } else {
        console.log('\u274c FAILED: Cannot find pattern to replace');
        process.exit(1);
    }
}
