#!/bin/bash

echo "=== 更新聊天 API 支持分頁 ==="

# 創建新的 getMessages 路由
cat > /tmp/new-chat.js << 'CHATEOF'
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");

const router = express_1.default.Router();
exports.chatRoutes = router;

// GET /api/chat/channels - 獲取用戶的聊天頻道
router.get('/channels', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;

        const channels = await db.all(`
            SELECT * FROM chat_channels
            WHERE participants LIKE ?
            ORDER BY created_at DESC
        `, [`%${currentUser.id}%`]);

        for (const channel of channels) {
            channel.participants = JSON.parse(channel.participants || '[]');

            const lastMessage = await db.get(`
                SELECT * FROM chat_messages
                WHERE channel_id = ?
                ORDER BY timestamp DESC LIMIT 1
            `, [channel.id]);
            channel.last_message = lastMessage || null;

            const allMessages = await db.all(`
                SELECT id, read_by FROM chat_messages
                WHERE channel_id = ? AND user_id != ?
            `, [channel.id, currentUser.id]);

            let unreadCount = 0;
            for (const msg of allMessages) {
                const readBy = JSON.parse(msg.read_by || '[]');
                if (!readBy.includes(currentUser.id)) {
                    unreadCount++;
                }
            }
            channel.unread_count = unreadCount;

            const participantDetails = [];
            for (const pId of channel.participants) {
                const user = await db.get('SELECT id, name, avatar, department FROM users WHERE id = ?', [pId]);
                if (user) participantDetails.push(user);
            }
            channel.participantDetails = participantDetails;
        }

        res.json({ channels });
    } catch (error) {
        console.error('獲取聊天頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// GET /api/chat/channels/:channelId/messages - 獲取頻道訊息（支持分頁）
router.get('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const before = req.query.before;
        const after = req.query.after;

        const channel = await db.get('SELECT participants FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        const participants = JSON.parse(channel.participants || '[]');
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '您不是此頻道的參與者' });
        }

        let query = 'SELECT * FROM chat_messages WHERE channel_id = ?';
        let params = [channelId];

        if (before) {
            query += ' AND timestamp < ?';
            params.push(before);
        }
        if (after) {
            query += ' AND timestamp > ?';
            params.push(after);
        }

        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        const messages = db.db.prepare(query).all(...params);
        const hasMore = messages.length === limit;

        // 反轉為時間升序
        messages.reverse();

        // 標記訊息為已讀
        for (const msg of messages) {
            msg.read_by = JSON.parse(msg.read_by || '[]');
            if (!msg.read_by.includes(currentUser.id)) {
                msg.read_by.push(currentUser.id);
                db.db.prepare('UPDATE chat_messages SET read_by = ? WHERE id = ?')
                    .run(JSON.stringify(msg.read_by), msg.id);
            }
        }

        res.json({ messages, hasMore });
    } catch (error) {
        console.error('獲取訊息錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/chat/channels/:channelId/messages - 發送訊息
router.post('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: '訊息內容不能為空' });
        }

        const channel = await db.get('SELECT participants FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        const participants = JSON.parse(channel.participants || '[]');
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '您不是此頻道的參與者' });
        }

        const user = await db.get('SELECT name, avatar FROM users WHERE id = ?', [currentUser.id]);
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_messages (id, channel_id, user_id, user_name, avatar, content, timestamp, read_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [messageId, channelId, currentUser.id, user?.name || currentUser.name, user?.avatar || '', content.trim(), now, JSON.stringify([currentUser.id])]);

        await db.run('UPDATE chat_channels SET last_message_id = ? WHERE id = ?', [messageId, channelId]);

        const message = {
            id: messageId,
            channel_id: channelId,
            user_id: currentUser.id,
            user_name: user?.name || currentUser.name,
            avatar: user?.avatar || '',
            content: content.trim(),
            timestamp: now,
            read_by: [currentUser.id]
        };

        res.json({ message });
    } catch (error) {
        console.error('發送訊息錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/chat/channels - 創建或獲取頻道
router.post('/channels', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { participant_ids, type = 'DIRECT', name } = req.body;

        if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
            return res.status(400).json({ error: '參與者列表不能為空' });
        }

        const allParticipants = [currentUser.id, ...participant_ids.filter(id => id !== currentUser.id)];
        allParticipants.sort();

        if (type === 'DIRECT' && allParticipants.length === 2) {
            const existingChannel = await db.get(`
                SELECT * FROM chat_channels
                WHERE type = 'DIRECT' AND participants = ?
            `, [JSON.stringify(allParticipants)]);

            if (existingChannel) {
                existingChannel.participants = JSON.parse(existingChannel.participants || '[]');
                return res.json({ channel: existingChannel, existing: true });
            }
        }

        const channelId = `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at)
            VALUES (?, ?, ?, ?, ?)
        `, [channelId, type, name || '', JSON.stringify(allParticipants), now]);

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        channel.participants = JSON.parse(channel.participants || '[]');

        res.json({ channel });
    } catch (error) {
        console.error('創建頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/chat/channels/:channelId/read - 標記已讀
router.post('/channels/:channelId/read', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;

        const messages = await db.all('SELECT id, read_by FROM chat_messages WHERE channel_id = ?', [channelId]);

        for (const msg of messages) {
            const readBy = JSON.parse(msg.read_by || '[]');
            if (!readBy.includes(currentUser.id)) {
                readBy.push(currentUser.id);
                await db.run('UPDATE chat_messages SET read_by = ? WHERE id = ?', [JSON.stringify(readBy), msg.id]);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('標記已讀錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// GET /api/chat/messages/:messageId/read-status - 獲取訊息已讀狀態
router.get('/messages/:messageId/read-status', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { messageId } = req.params;

        const message = await db.get('SELECT read_by FROM chat_messages WHERE id = ?', [messageId]);
        if (!message) {
            return res.status(404).json({ error: '訊息不存在' });
        }

        const readByIds = JSON.parse(message.read_by || '[]');
        const readByUsers = [];

        for (const userId of readByIds) {
            const user = await db.get('SELECT id, name, avatar FROM users WHERE id = ?', [userId]);
            if (user) readByUsers.push(user);
        }

        res.json({ readBy: readByUsers });
    } catch (error) {
        console.error('獲取已讀狀態錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
CHATEOF

# 複製到容器
docker cp /tmp/new-chat.js taskflow-pro:/app/dist/routes/chat.js

# 重啟容器
docker restart taskflow-pro

echo "=== 等待服務啟動 ==="
sleep 10

# 驗證
echo "=== 驗證服務 ==="
curl -s http://localhost:3000/api/health

echo ""
echo "=== 檢查 after 參數 ==="
docker exec taskflow-pro grep -n "after" /app/dist/routes/chat.js | head -5

echo ""
echo "=== 完成 ==="
