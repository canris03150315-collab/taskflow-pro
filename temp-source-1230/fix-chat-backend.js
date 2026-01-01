// 修復聊天後端 - 添加必要的表格和更新 chat.js
const fs = require('fs');

// 1. 創建新的 chat.js 路由（使用現有資料庫結構）
const chatRoutes = `"use strict";
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

        // 獲取用戶參與的所有頻道
        const channels = await db.all(\`
            SELECT * FROM chat_channels 
            WHERE participants LIKE ?
            ORDER BY created_at DESC
        \`, [\`%\${currentUser.id}%\`]);

        // 處理每個頻道
        for (const channel of channels) {
            // 解析參與者
            channel.participants = JSON.parse(channel.participants || '[]');
            
            // 獲取最後訊息
            const lastMessage = await db.get(\`
                SELECT * FROM chat_messages 
                WHERE channel_id = ? 
                ORDER BY timestamp DESC LIMIT 1
            \`, [channel.id]);
            channel.last_message = lastMessage || null;
            
            // 計算未讀數
            const allMessages = await db.all(\`
                SELECT id, read_by FROM chat_messages 
                WHERE channel_id = ? AND user_id != ?
            \`, [channel.id, currentUser.id]);
            
            let unreadCount = 0;
            for (const msg of allMessages) {
                const readBy = JSON.parse(msg.read_by || '[]');
                if (!readBy.includes(currentUser.id)) {
                    unreadCount++;
                }
            }
            channel.unread_count = unreadCount;

            // 獲取參與者詳細資料
            const participantDetails = [];
            for (const pId of channel.participants) {
                const user = await db.get('SELECT id, name, avatar, department FROM users WHERE id = ?', [pId]);
                if (user) participantDetails.push(user);
            }
            channel.participant_details = participantDetails;
        }

        res.json({ channels });
    } catch (error) {
        console.error('獲取聊天頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/chat/channels - 創建聊天頻道
router.post('/channels', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { name, type, participant_ids } = req.body;

        const allParticipants = [currentUser.id, ...(participant_ids || [])];

        // 如果是私聊，檢查是否已存在
        if (type === 'DIRECT' && participant_ids && participant_ids.length === 1) {
            const existing = await db.all(\`SELECT * FROM chat_channels WHERE type = 'DIRECT'\`);
            for (const ch of existing) {
                const parts = JSON.parse(ch.participants || '[]');
                if (parts.includes(currentUser.id) && parts.includes(participant_ids[0])) {
                    ch.participants = parts;
                    return res.json({ channel: ch, existing: true });
                }
            }
        }

        const channelId = \`channel-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
        const now = new Date().toISOString();

        await db.run(\`
            INSERT INTO chat_channels (id, type, name, participants, created_at)
            VALUES (?, ?, ?, ?, ?)
        \`, [channelId, type || 'DIRECT', name || '', JSON.stringify(allParticipants), now]);

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        channel.participants = JSON.parse(channel.participants || '[]');
        
        res.json({ channel });
    } catch (error) {
        console.error('創建聊天頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// GET /api/chat/channels/:channelId/messages - 獲取頻道訊息
router.get('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { limit = '50' } = req.query;

        // 驗證用戶是否為頻道參與者
        const channel = await db.get('SELECT participants FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }
        
        const participants = JSON.parse(channel.participants || '[]');
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '您不是此頻道的參與者' });
        }

        const messages = await db.all(\`
            SELECT * FROM chat_messages 
            WHERE channel_id = ? 
            ORDER BY timestamp ASC
            LIMIT ?
        \`, [channelId, parseInt(limit)]);

        // 標記訊息為已讀
        for (const msg of messages) {
            const readBy = JSON.parse(msg.read_by || '[]');
            if (!readBy.includes(currentUser.id)) {
                readBy.push(currentUser.id);
                await db.run('UPDATE chat_messages SET read_by = ? WHERE id = ?', 
                    [JSON.stringify(readBy), msg.id]);
            }
            msg.read_by = readBy;
        }

        res.json({ messages });
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

        // 驗證用戶是否為頻道參與者
        const channel = await db.get('SELECT participants FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }
        
        const participants = JSON.parse(channel.participants || '[]');
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '您不是此頻道的參與者' });
        }

        const user = await db.get('SELECT name, avatar FROM users WHERE id = ?', [currentUser.id]);
        const messageId = \`msg-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
        const now = new Date().toISOString();

        await db.run(\`
            INSERT INTO chat_messages (id, channel_id, user_id, user_name, avatar, content, timestamp, read_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        \`, [messageId, channelId, currentUser.id, user?.name || currentUser.name, user?.avatar || '', content.trim(), now, JSON.stringify([currentUser.id])]);

        // 更新頻道的最後訊息
        await db.run('UPDATE chat_channels SET last_message_id = ? WHERE id = ?', [messageId, channelId]);

        const message = {
            id: messageId,
            channel_id: channelId,
            user_id: currentUser.id,
            user_name: user?.name || currentUser.name,
            avatar: user?.avatar,
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

// POST /api/chat/channels/:channelId/read - 標記頻道所有訊息為已讀
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
                await db.run('UPDATE chat_messages SET read_by = ? WHERE id = ?', 
                    [JSON.stringify(readBy), msg.id]);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('標記已讀錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// GET /api/chat/users - 獲取可聊天的用戶列表
router.get('/users', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;

        const users = await db.all(\`
            SELECT id, name, avatar, department, role
            FROM users
            WHERE id != ?
            ORDER BY name
        \`, [currentUser.id]);

        res.json({ users });
    } catch (error) {
        console.error('獲取用戶列表錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
`;

fs.writeFileSync('/app/dist/routes/chat.js', chatRoutes);
console.log('chat.js 已更新');
