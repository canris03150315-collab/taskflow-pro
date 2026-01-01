#!/bin/bash

echo "=== 開始更新聊天 API 支持分頁和增量查詢 ==="

# 備份原始文件
docker exec taskflow-pro cp /app/dist/routes/chat.js /app/dist/routes/chat.js.backup

# 使用 Node.js 腳本修改 chat.js
docker exec taskflow-pro node -e "
const fs = require('fs');
const filePath = '/app/dist/routes/chat.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到 getMessages 路由並替換
const oldPattern = /router\.get\('\/channels\/:channelId\/messages'[\s\S]*?}\);[\s\S]*?}\);/;

const newRoute = \`router.get('/channels/:channelId/messages', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { limit = '50', before, after } = req.query;

        const isParticipant = await db.get(\\\`
            SELECT 1 FROM channel_participants WHERE channel_id = ? AND user_id = ?
        \\\`, [channelId, currentUser.id]);

        if (!isParticipant) {
            return res.status(403).json({ error: '您不是此頻道的參與者' });
        }

        let query = \\\`
            SELECT m.*, u.name as user_name, u.avatar
            FROM chat_messages m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.channel_id = ?
        \\\`;
        const params = [channelId];

        if (before) {
            query += ' AND m.created_at < ?';
            params.push(before);
        }

        if (after) {
            query += ' AND m.created_at > ?';
            params.push(after);
        }

        query += ' ORDER BY m.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const messages = await db.all(query, params);

        for (const msg of messages) {
            await db.run(\\\`
                INSERT OR IGNORE INTO message_read_status (message_id, user_id, read_at)
                VALUES (?, ?, ?)
            \\\`, [msg.id, currentUser.id, new Date().toISOString()]);
        }

        const result = after ? messages.reverse() : messages.reverse();
        
        res.json({ 
            messages: result,
            hasMore: messages.length === parseInt(limit)
        });
    } catch (error) {
        console.error('獲取訊息錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});\`;

if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newRoute);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ chat.js 已更新');
} else {
    console.log('❌ 找不到目標路由，請檢查文件結構');
    process.exit(1);
}
"

if [ $? -eq 0 ]; then
    echo "=== 重啟容器 ==="
    docker restart taskflow-pro
    
    echo "=== 等待服務啟動 ==="
    sleep 5
    
    echo "=== 驗證更新 ==="
    docker exec taskflow-pro grep -A 5 "after" /app/dist/routes/chat.js | head -10
    
    echo "=== 完成！==="
else
    echo "=== 更新失敗，恢復備份 ==="
    docker exec taskflow-pro cp /app/dist/routes/chat.js.backup /app/dist/routes/chat.js
    docker restart taskflow-pro
fi
