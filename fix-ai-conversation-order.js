const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// 修改 GET /conversations 路由的排序順序
// 從 DESC（降序）改為 ASC（升序），讓最舊的對話在前面
content = content.replace(
  /ORDER BY created_at DESC LIMIT/g,
  'ORDER BY created_at ASC LIMIT'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed AI conversation order - changed DESC to ASC');
