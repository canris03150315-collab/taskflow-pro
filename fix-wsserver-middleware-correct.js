const fs = require('fs');

console.log('Fixing wsServer middleware placement...\n');

try {
  const filePath = '/app/dist/server.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. 移除錯誤位置的中間件（在 server.listen 之後）
  const wrongMiddleware = `                    // Add middleware to attach wsServer to all requests
                    this.app.use((req, res, next) => {
                        req.wsServer = this.wsServer;
                        next();
                    });`;
  
  if (content.includes(wrongMiddleware)) {
    content = content.replace(wrongMiddleware, '');
    console.log('✅ Removed middleware from wrong location (after server.listen)');
  }
  
  // 2. 在 setupRoutes 之前添加中間件佔位符
  // 先找到 setupRoutes 的位置
  const setupRoutesPattern = 'this.setupRoutes();';
  
  if (!content.includes(setupRoutesPattern)) {
    console.log('⚠️  Could not find setupRoutes call');
    process.exit(1);
  }
  
  // 3. 在 constructor 中初始化 wsServer 為 null
  const constructorPattern = 'constructor(config) {';
  const constructorReplacement = `constructor(config) {
        this.wsServer = null;`;
  
  if (content.includes('this.wsServer = null')) {
    console.log('ℹ️  wsServer already initialized in constructor');
  } else {
    content = content.replace(constructorPattern, constructorReplacement);
    console.log('✅ Added wsServer initialization in constructor');
  }
  
  // 4. 在 setupRoutes 之前添加中間件
  const beforeSetupRoutes = `        // Middleware to attach wsServer to all requests
        this.app.use((req, res, next) => {
            req.wsServer = this.wsServer;
            next();
        });
        
        this.setupRoutes();`;
  
  if (content.includes('req.wsServer = this.wsServer') && content.includes('this.setupRoutes()')) {
    // 檢查是否在正確位置
    const middlewareBeforeRoutes = content.indexOf('req.wsServer = this.wsServer') < content.indexOf('this.setupRoutes()');
    if (middlewareBeforeRoutes) {
      console.log('ℹ️  Middleware already in correct position (before setupRoutes)');
    } else {
      content = content.replace(setupRoutesPattern, beforeSetupRoutes);
      console.log('✅ Added middleware before setupRoutes');
    }
  } else {
    content = content.replace(setupRoutesPattern, beforeSetupRoutes);
    console.log('✅ Added middleware before setupRoutes');
  }
  
  // 寫回文件
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\n✅ wsServer middleware placement fixed');
  console.log('📝 Middleware will now be executed before routes are registered');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
