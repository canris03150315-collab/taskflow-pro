const fs = require('fs');

console.log('Adding wsServer middleware in initializeMiddleware...\n');

try {
  const filePath = '/app/dist/server.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 在 initializeMiddleware 方法的最後（在 req.db = this.db; 之後）添加 wsServer 中間件
  const dbMiddleware = '            req.db = this.db;';
  
  const wsServerMiddleware = `            req.db = this.db;
            req.wsServer = this.wsServer;`;
  
  if (content.includes('req.wsServer = this.wsServer') && content.includes('req.db = this.db')) {
    console.log('ℹ️  wsServer middleware already exists');
  } else {
    content = content.replace(dbMiddleware, wsServerMiddleware);
    console.log('✅ Added wsServer to request middleware');
  }
  
  // 在 constructor 中初始化 wsServer
  const constructorPattern = '        this.app = (0, express_1.default)();';
  const constructorWithWsServer = `        this.app = (0, express_1.default)();
        this.wsServer = null;`;
  
  if (content.includes('this.wsServer = null')) {
    console.log('ℹ️  wsServer already initialized in constructor');
  } else {
    content = content.replace(constructorPattern, constructorWithWsServer);
    console.log('✅ Added wsServer initialization in constructor');
  }
  
  // 寫回文件
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\n✅ wsServer middleware added to initializeMiddleware');
  console.log('📝 req.wsServer will now be available in all routes');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
