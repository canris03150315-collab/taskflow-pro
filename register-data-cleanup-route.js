const fs = require('fs');

// 讀取 server.js
const serverPath = '/app/dist/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// 檢查是否已經註冊
if (serverContent.includes('data-cleanup')) {
  console.log('INFO: data-cleanup route already registered');
  process.exit(0);
}

// 找到其他路由註冊的位置，在附近添加新路由
const routePattern = /const.*?=.*?require\(['"]\.\/routes\/.*?['"]\);/g;
const matches = serverContent.match(routePattern);

if (matches && matches.length > 0) {
  // 在最後一個 require 後面添加
  const lastRequire = matches[matches.length - 1];
  const insertPosition = serverContent.indexOf(lastRequire) + lastRequire.length;
  
  const newRequire = "\nconst data_cleanup_1 = require('./routes/data-cleanup');";
  serverContent = serverContent.slice(0, insertPosition) + newRequire + serverContent.slice(insertPosition);
}

// 找到路由註冊的位置（app.use）
const usePattern = /this\.app\.use\(['"]\/api\/.*?['"]/g;
const useMatches = serverContent.match(usePattern);

if (useMatches && useMatches.length > 0) {
  // 在最後一個 app.use 後面添加
  const lastUse = useMatches[useMatches.length - 1];
  const lastUseEnd = serverContent.indexOf(';', serverContent.indexOf(lastUse));
  
  const newUse = "\n        this.app.use('/api/data-cleanup', data_cleanup_1.dataCleanupRoutes);";
  serverContent = serverContent.slice(0, lastUseEnd + 1) + newUse + serverContent.slice(lastUseEnd + 1);
}

// 寫回文件
fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('SUCCESS: Registered data-cleanup route in server.js');
