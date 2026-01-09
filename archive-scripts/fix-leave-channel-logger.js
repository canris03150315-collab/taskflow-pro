"use strict";
const fs = require('fs');

// 讀取文件
const filePath = '/app/dist/routes/chat.js';
let content = fs.readFileSync(filePath, 'utf8');

// 移除 logger 調用，因為 chat.js 可能沒有引入 logger
content = content.replace(
    /await \(0, logger_1\.logSystemAction\)\(db, currentUser, 'LEAVE_CHANNEL', `離開群組: \$\{channel\.name\}`\);/g,
    '// 記錄已在資料庫操作中完成'
);

// 寫回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ 已修復離開群組 API 的 logger 問題');
