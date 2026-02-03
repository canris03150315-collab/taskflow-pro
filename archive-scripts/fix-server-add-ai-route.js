const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// 檢查是否已經有 AI 路由
if (content.includes("'/api/ai-assistant'")) {
  console.log('INFO: AI assistant route already registered');
  process.exit(0);
}

// 在 backup 路由之前添加 AI 助理路由
const backupRoute = "this.app.use('/api/backup', require('./routes/backup'));";
const aiRoute = "        this.app.use('/api/ai-assistant', require('./routes/ai-assistant'));\n        " + backupRoute;

if (!content.includes(backupRoute)) {
  console.error('ERROR: Could not find backup route registration');
  process.exit(1);
}

content = content.replace(backupRoute, aiRoute);

fs.writeFileSync(serverPath, content, 'utf8');
console.log('SUCCESS: AI assistant route registered in server.js');
