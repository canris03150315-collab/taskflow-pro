const fs = require('fs');

console.log('Fixing WebSocket authentication...\n');

try {
  const filePath = '/app/dist/websocket-server.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 修復 AUTH 訊息處理：從 message.userId 改為 message.payload.userId
  const oldAuth = `if (message.type === 'AUTH') {
                    userId = message.userId;`;
  
  const newAuth = `if (message.type === 'AUTH') {
                    userId = message.payload?.userId || message.userId;`;
  
  if (content.includes(oldAuth)) {
    content = content.replace(oldAuth, newAuth);
    console.log('✅ Step 1: Fixed AUTH message handler to read from payload');
  } else {
    console.log('⚠️  Step 1: AUTH handler already fixed or not found in expected format');
  }
  
  // 寫回文件
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\n✅ WebSocket authentication fix complete');
  console.log('📝 Changes:');
  console.log('   - AUTH handler now reads userId from message.payload.userId');
  console.log('   - Fallback to message.userId for backward compatibility');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
