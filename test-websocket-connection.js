// 在容器內測試 WebSocket 連接
const WebSocket = require('ws');

console.log('測試 WebSocket 連接...');

// 測試本地連接
const ws = new WebSocket('ws://localhost:3000/ws?token=test');

ws.on('open', function open() {
  console.log('✅ WebSocket 連接成功！');
  ws.close();
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket 連接失敗:', err.message);
});

ws.on('close', function close() {
  console.log('WebSocket 連接已關閉');
  process.exit(0);
});

setTimeout(() => {
  console.log('⏱️ 連接超時');
  process.exit(1);
}, 5000);
