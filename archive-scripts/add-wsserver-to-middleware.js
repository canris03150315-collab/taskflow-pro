const fs = require('fs');

console.log('Adding wsServer to middleware...\n');

try {
  const filePath = '/app/dist/server.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 在 req.db = this.db; 之後添加 req.wsServer
  const oldCode = `            req.db = this.db;
            next();`;
  
  const newCode = `            req.db = this.db;
            req.wsServer = this.app.get('wsServer');
            next();`;
  
  if (content.includes("req.wsServer = this.app.get('wsServer')")) {
    console.log('ℹ️  wsServer middleware already exists');
  } else {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added wsServer to middleware');
  }
  
  console.log('\n✅ Complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
