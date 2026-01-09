#!/bin/bash

# 備份並更新 chat.js 的 GET messages 路由
cat > /app/dist/routes/chat.js << 'CHATEOF'
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
            channel.participant_details = participantDetails;
        }

        res.json({ channels });
    } catch (error) {
        console.error('獲取聊天頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// GET /api/chat/channels/:channelId/messages - 獲取頻道訊息
router.get('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        console.log('GET messages - channelId:', channelId, 'userId:', currentUser.id);

        const channel = await db.get('SELECT participants FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            console.log('Channel not found');
            return res.status(404).json({ error: '頻道不存在' });
        }

        const participants = JSON.parse(channel.participants || '[]');
        if (!participants.includes(currentUser.id)) {
            console.log('User not participant');
            return res.status(403).json({ error: '您不是此頻道的參與者' });
        }

        // 直接使用 better-sqlite3 語法
        const messages = db.db.prepare(`
            SELECT * FROM chat_messages
            WHERE channel_id = ?
            ORDER BY timestamp ASC
            LIMIT ?
        `).all(channelId, limit);

        console.log('Found', messages.length, 'messages');

        // 標記訊息為已讀
        for (const msg of messages) {
            msg.read_by = JSON.parse(msg.read_by || '[]');
            if (!msg.read_by.includes(currentUser.id)) {
                msg.read_by.push(currentUser.id);
                db.db.prepare('UPDATE chat_messages SET read_by = ? WHERE id = ?')
                    .run(JSON.stringify(msg.read_by), msg.id);
            }
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

// POST /api/chat/channels/direct - 創建私聊頻道
router.post('/channels/direct', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { user1, user2 } = req.body;

        const participantIds = [user1 || currentUser.id, user2].filter(Boolean);
        if (participantIds.length !== 2) {
            return res.status(400).json({ error: '需要兩個用戶 ID' });
        }

        const existing = await db.all(`SELECT * FROM chat_channels WHERE type = 'DIRECT'`);
        for (const ch of existing) {
            const parts = JSON.parse(ch.participants || '[]');
            if (parts.includes(participantIds[0]) && parts.includes(participantIds[1])) {
                ch.participants = parts;
                return res.json({ id: ch.id, type: ch.type, name: ch.name, participants: parts, existing: true });
            }
        }

        const channelId = `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at)
            VALUES (?, ?, ?, ?, ?)
        `, [channelId, 'DIRECT', '', JSON.stringify(participantIds), now]);

        res.json({ 
            id: channelId, 
            type: 'DIRECT', 
            name: '', 
            participants: participantIds,
            unreadCount: 0
        });
    } catch (error) {
        console.error('創建私聊頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// GET /api/chat/users - 獲取可聊天的用戶列表
router.get('/users', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;

        const users = await db.all(`
            SELECT id, name, avatar, department, role
            FROM users
            WHERE id != ?
            ORDER BY name
        `, [currentUser.id]);

        res.json({ users });
    } catch (error) {
        console.error('獲取用戶列表錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
CHATEOF

echo "Chat routes updated with direct DB access!"
