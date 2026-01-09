const fs = require('fs');

console.log('Final fix for wsServer middleware...\n');

try {
  const filePath = '/app/dist/server.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. 移除 server.listen 之後的錯誤中間件
  const wrongMiddleware = `                    // Add middleware to attach wsServer to all requests
                    this.app.use((req, res, next) => {
                        req.wsServer = this.wsServer;
                        next();
                    });`;
  
  if (content.includes(wrongMiddleware)) {
    content = content.replace(wrongMiddleware, '');
    console.log('✅ Removed wrong middleware after server.listen');
  }
  
  // 2. 修改 initializeMiddleware 中的中間件，使其動態獲取 wsServer
  const oldMiddleware = `            req.db = this.db;
            req.wsServer = this.wsServer;`;
  
  const newMiddleware = `            req.db = this.db;
            // Dynamically get wsServer (it's set after server starts)
            req.wsServer = this.app.get('wsServer');`;
  
  if (content.includes('req.wsServer = this.app.get')) {
    console.log('ℹ️  Dynamic wsServer middleware already exists');
  } else if (content.includes('req.wsServer = this.wsServer')) {
    content = content.replace(oldMiddleware, newMiddleware);
    console.log('✅ Changed to dynamic wsServer middleware using app.get()');
  } else {
    console.log('⚠️  Could not find wsServer middleware to update');
  }
  
  // 寫回文件
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\n✅ Final wsServer middleware fix complete');
  console.log('📝 req.wsServer will now dynamically get the WebSocket server');
  console.log('📝 This works because wsServer is set with app.set() after server starts');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
