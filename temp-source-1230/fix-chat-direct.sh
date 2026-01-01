#!/bin/bash

# 備份原始 chat.js
cp /app/dist/routes/chat.js /app/dist/routes/chat.js.bak

# 在 chat.js 末尾添加 /channels/direct 端點 (在最後的 exports 之前)
cat >> /app/dist/routes/chat.js << 'ENDOFFILE'

// POST /api/chat/channels/direct - 創建私聊頻道
router.post('/channels/direct', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { user1, user2 } = req.body;

        // 確定兩個用戶 ID
        const participantIds = [user1 || currentUser.id, user2].filter(Boolean);
        if (participantIds.length !== 2) {
            return res.status(400).json({ error: '需要兩個用戶 ID' });
        }

        // 檢查是否已存在私聊頻道
        const existing = await db.all(`SELECT * FROM chat_channels WHERE type = 'DIRECT'`);
        for (const ch of existing) {
            const parts = JSON.parse(ch.participants || '[]');
            if (parts.includes(participantIds[0]) && parts.includes(participantIds[1])) {
                ch.participants = parts;
                return res.json({ id: ch.id, type: ch.type, name: ch.name, participants: parts, existing: true });
            }
        }

        // 創建新的私聊頻道
        const channelId = `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at)
            VALUES (?, ?, ?, ?, ?)
        `, [channelId, 'DIRECT', '', JSON.stringify(participantIds), now]);

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        
        res.json({ 
            id: channel.id, 
            type: channel.type, 
            name: channel.name, 
            participants: participantIds,
            unreadCount: 0
        });
    } catch (error) {
        console.error('創建私聊頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
ENDOFFILE

echo "Chat direct endpoint added!"
