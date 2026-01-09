const fs = require('fs');

const filePath = '/app/dist/routes/work-logs.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing WebSocket broadcast in work-logs.js...');

// 修復 DELETE 路由的 WebSocket 廣播
content = content.replace(
  /\/\/ WebSocket broadcast\s+if \(req\.wss\) {\s+req\.wss\.broadcast\({ type: 'work_log_deleted', payload: { id } }\);\s+}/g,
  `// Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('work_log_deleted', { id });
    }`
);

// 修復 POST 路由的 WebSocket 廣播
content = content.replace(
  /\/\/ WebSocket broadcast\s+if \(req\.wss\) {\s+req\.wss\.broadcast\({ type: 'work_log_created', payload: log }\);\s+}/g,
  `// Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('work_log_created', log);
    }`
);

// 修復 PUT 路由的 WebSocket 廣播
content = content.replace(
  /\/\/ WebSocket broadcast\s+if \(req\.wss\) {\s+req\.wss\.broadcast\({ type: 'work_log_updated', payload: updated }\);\s+}/g,
  `// Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('work_log_updated', updated);
    }`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: WebSocket broadcasts fixed in work-logs.js');
