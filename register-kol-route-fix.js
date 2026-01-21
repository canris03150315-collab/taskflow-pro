const fs = require('fs');

const indexPath = '/app/dist/index.js';
let content = fs.readFileSync(indexPath, 'utf8');

// 檢查是否已經註冊 KOL 路由
if (content.includes("require('./routes/kol')")) {
  console.log('KOL route already registered');
  process.exit(0);
}

// 找到其他路由註冊的位置（例如 tasks 或 users）
const routePattern = /const \w+Routes = require\('\.\/routes\/\w+'\);/;
const match = content.match(routePattern);

if (!match) {
  console.error('ERROR: Cannot find route registration pattern');
  process.exit(1);
}

// 在找到的位置後添加 KOL 路由
const insertPosition = content.indexOf(match[0]) + match[0].length;
const kolRouteImport = "\nconst kolRoutes = require('./routes/kol');";

content = content.slice(0, insertPosition) + kolRouteImport + content.slice(insertPosition);

// 找到 app.use 註冊的位置
const appUsePattern = /app\.use\('\/api\/\w+',\s*\w+Routes\);/;
const appUseMatch = content.match(appUsePattern);

if (!appUseMatch) {
  console.error('ERROR: Cannot find app.use pattern');
  process.exit(1);
}

// 在找到的位置後添加 KOL 路由註冊
const appUsePosition = content.indexOf(appUseMatch[0]) + appUseMatch[0].length;
const kolRouteUse = "\napp.use('/api/kol', kolRoutes);";

content = content.slice(0, appUsePosition) + kolRouteUse + content.slice(appUsePosition);

// 寫回文件
fs.writeFileSync(indexPath, content, 'utf8');

console.log('SUCCESS: KOL route registered in index.js');
console.log('- Added: const kolRoutes = require(\'./routes/kol\');');
console.log('- Added: app.use(\'/api/kol\', kolRoutes);');
