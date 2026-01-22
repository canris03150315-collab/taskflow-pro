const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Checking AI route registration...');

// 檢查是否已經有 AI 路由
if (content.includes("'/api/ai-assistant'")) {
  console.log('AI assistant route already registered');
  process.exit(0);
}

// 找到 kol 路由註冊的位置
const kolLine = "this.app.use('/api/kol', require('./routes/kol'));";

if (!content.includes(kolLine)) {
  console.error('ERROR: Could not find KOL route registration');
  process.exit(1);
}

// 在 kol 路由之後添加 AI 路由
const newLines = kolLine + "\n        this.app.use('/api/ai-assistant', require('./routes/ai-assistant'));";

content = content.replace(kolLine, newLines);

fs.writeFileSync(serverPath, content, 'utf8');
console.log('SUCCESS: AI assistant route registered after KOL route');
