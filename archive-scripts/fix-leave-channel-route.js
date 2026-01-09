"use strict";
const fs = require('fs');

// 讀取文件
const filePath = '/app/dist/routes/chat.js';
let content = fs.readFileSync(filePath, 'utf8');

// 修復路由路徑：從 /:channelId/leave 改為 /channels/:channelId/leave
content = content.replace(
    /router\.post\('\/:channelId\/leave'/g,
    "router.post('/channels/:channelId/leave'"
);

// 寫回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ 已修復離開群組路由路徑');
