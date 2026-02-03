const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// 檢查是否已經註冊 KOL 路由
if (content.includes("require('./routes/kol')") || content.includes('/api/kol')) {
  console.log('KOL route already registered');
  process.exit(0);
}

// 在 backup 路由之前添加 KOL 路由
const backupLine = "this.app.use('/api/backup', require('./routes/backup'));";

if (!content.includes(backupLine)) {
  console.error('ERROR: Cannot find backup route registration');
  process.exit(1);
}

// 添加 KOL 路由註冊
const kolRouteRegistration = "        this.app.use('/api/kol', require('./routes/kol'));\n        ";

content = content.replace(backupLine, kolRouteRegistration + backupLine);

// 寫回文件
fs.writeFileSync(serverPath, content, 'utf8');

console.log('SUCCESS: KOL route registered in server.js');
console.log("- Added: this.app.use('/api/kol', require('./routes/kol'));");
