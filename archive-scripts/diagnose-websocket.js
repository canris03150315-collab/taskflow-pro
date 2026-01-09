const fs = require('fs');

console.log('Diagnosing WebSocket implementation...\n');

try {
  const indexPath = '/app/dist/index.js';
  const content = fs.readFileSync(indexPath, 'utf8');
  
  // 查找 WebSocket 相關代碼
  const wsServerMatch = content.match(/wss\.on\(['"]connection['"],.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n/s);
  
  if (wsServerMatch) {
    console.log('Found WebSocket connection handler:');
    console.log(wsServerMatch[0]);
  } else {
    console.log('WebSocket connection handler not found in expected format');
  }
  
  // 查找用戶認證相關代碼
  const authMatch = content.match(/ws\.on\(['"]message['"],.*?\n.*?\n.*?\n.*?\n.*?\n/s);
  
  if (authMatch) {
    console.log('\nFound WebSocket message handler:');
    console.log(authMatch[0]);
  }
  
  // 查找 broadcastToAll 函數
  const broadcastMatch = content.match(/broadcastToAll.*?\{[\s\S]{0,500}\}/);
  
  if (broadcastMatch) {
    console.log('\nFound broadcastToAll function:');
    console.log(broadcastMatch[0].substring(0, 300));
  }
  
  console.log('\n✅ Diagnosis complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
