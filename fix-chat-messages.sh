#!/bin/bash

# 更新 chat.js 的 GET messages 路由，添加調試信息
cat > /app/dist/routes/chat-debug.js << 'EOF'
// 測試直接查詢訊息
const testMessages = async (db, channelId) => {
    const msgs = await db.all('SELECT * FROM chat_messages WHERE channel_id = ?', [channelId]);
    console.log('Direct query for channel', channelId, ':', msgs.length, 'messages');
    return msgs;
};

module.exports = { testMessages };
EOF

echo "Debug file created"
