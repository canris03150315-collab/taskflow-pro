const fs = require('fs');

console.log('Fixing WebSocket authentication...\n');

try {
  const filePath = '/app/dist/websocket-server.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 精確替換：從 message.userId 改為 message.payload?.userId || message.userId
  const oldLine = "                    userId = message.userId;";
  const newLine = "                    userId = message.payload?.userId || message.userId;";
  
  if (content.includes(oldLine)) {
    content = content.replace(oldLine, newLine);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fixed: AUTH handler now reads userId from message.payload.userId');
    console.log('   Old: userId = message.userId;');
    console.log('   New: userId = message.payload?.userId || message.userId;');
  } else {
    console.log('⚠️  AUTH handler already fixed or format changed');
  }
  
  console.log('\n✅ WebSocket authentication fix complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
