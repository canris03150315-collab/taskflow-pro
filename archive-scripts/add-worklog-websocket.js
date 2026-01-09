const fs = require('fs');

const filePath = '/app/dist/routes/work-logs.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding WebSocket broadcast to work-logs.js...');

// 在 DELETE 路由的成功響應前添加 WebSocket 廣播
const deletePattern = /await db\.run\("DELETE FROM work_logs WHERE id = \?", \[id\]\);\s*res\.json\({ success: true }\);/;

if (content.match(deletePattern)) {
  content = content.replace(
    deletePattern,
    `await db.run("DELETE FROM work_logs WHERE id = ?", [id]);
    
    // WebSocket broadcast
    if (req.wss) {
      req.wss.broadcast({ type: 'work_log_deleted', payload: { id } });
    }
    
    res.json({ success: true });`
  );
  console.log('Added WebSocket broadcast to DELETE route');
} else {
  console.log('DELETE pattern not found, trying alternative...');
}

// 在 POST 路由添加 WebSocket 廣播
const postPattern = /const log = await db\.get\("SELECT \* FROM work_logs WHERE id = \?", \[id\]\);\s*res\.json\(log\);/;

if (content.match(postPattern)) {
  content = content.replace(
    postPattern,
    `const log = await db.get("SELECT * FROM work_logs WHERE id = ?", [id]);
    
    // WebSocket broadcast
    if (req.wss) {
      req.wss.broadcast({ type: 'work_log_created', payload: log });
    }
    
    res.json(log);`
  );
  console.log('Added WebSocket broadcast to POST route');
}

// 在 PUT 路由添加 WebSocket 廣播
const putPattern = /const updated = await db\.get\("SELECT \* FROM work_logs WHERE id = \?", \[id\]\);\s*res\.json\(updated\);/;

if (content.match(putPattern)) {
  content = content.replace(
    putPattern,
    `const updated = await db.get("SELECT * FROM work_logs WHERE id = ?", [id]);
    
    // WebSocket broadcast
    if (req.wss) {
      req.wss.broadcast({ type: 'work_log_updated', payload: updated });
    }
    
    res.json(updated);`
  );
  console.log('Added WebSocket broadcast to PUT route');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: WebSocket broadcasts added to work-logs.js');
