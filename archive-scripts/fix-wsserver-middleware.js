const fs = require('fs');

console.log('Adding wsServer middleware to server.js...\n');

try {
  const filePath = '/app/dist/server.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 查找設置 wsServer 的位置
  const wsServerSetPattern = "this.app.set('wsServer', this.wsServer);";
  
  if (!content.includes(wsServerSetPattern)) {
    console.log('⚠️  Could not find wsServer set pattern');
    process.exit(1);
  }
  
  // 在設置 wsServer 後添加中間件
  const middlewareCode = `
                    // Add middleware to attach wsServer to all requests
                    this.app.use((req, res, next) => {
                        req.wsServer = this.wsServer;
                        next();
                    });`;
  
  if (content.includes('req.wsServer = this.wsServer')) {
    console.log('ℹ️  wsServer middleware already exists');
  } else {
    content = content.replace(
      wsServerSetPattern,
      wsServerSetPattern + middlewareCode
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added wsServer middleware');
    console.log('📝 Now req.wsServer will be available in all routes');
  }
  
  console.log('\n✅ wsServer middleware configuration complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
