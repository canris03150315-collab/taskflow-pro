"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const auth_1 = require("../middleware/auth");

const router = express.Router();

// 輔助函數：安全的 JSON 解析
function safeJsonParse(str, fallback = []) {
    if (!str) return fallback;
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error('JSON 解析失敗:', str, e);
        return fallback;
    }
}

// 初始化聊天室資料庫表
async function initChatTables(db) {
    await db.run(`
        CREATE TABLE IF NOT EXISTS chat_channels (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK(type IN ('DIRECT', 'GROUP')),
            name TEXT,
            participants TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            read_by TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE
        )
    `);

    await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_channel ON chat_messages(channel_id, created_at DESC)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_user ON chat_messages(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_channels_participants ON chat_channels(participants)`);
}

// 獲取用戶的所有聊天頻道
router.get('/channels', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        await initChatTables(db);

        const channels = await db.all(`
            SELECT * FROM chat_channels 
            WHERE participants LIKE '%' || ? || '%'
            ORDER BY updated_at DESC
        `, [currentUser.id]);

        // 在記憶體中進行精確過濾
        const filteredChannels = channels.filter(channel => {
            const p = safeJsonParse(channel.participants);
            return Array.isArray(p) && p.includes(currentUser.id);
        });

        const channelsWithDetails = await Promise.all(filteredChannels.map(async (channel) => {
            const participants = safeJsonParse(channel.participants);
            
            const lastMessage = await db.get(`
                SELECT m.*, u.name as user_name, u.avatar
                FROM chat_messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.channel_id = ?
                ORDER BY m.created_at DESC
                LIMIT 1
            `, [channel.id]);

            const unreadCount = await db.get(`
                SELECT COUNT(*) as count
                FROM chat_messages
                WHERE channel_id = ?
                AND user_id != ?
            `, [channel.id, currentUser.id]);

            // 獲取訊息後在記憶體中過濾未讀
            const messages = await db.all(`
                SELECT read_by FROM chat_messages 
                WHERE channel_id = ? AND user_id != ?
            `, [channel.id, currentUser.id]);
            
            const actualUnreadCount = messages.filter(m => {
                const readBy = safeJsonParse(m.read_by);
                return !readBy.includes(currentUser.id);
            }).length;

            let participantDetails = [];
            if (participants.length > 0) {
                participantDetails = await db.all(`
                    SELECT id, name, avatar, department, role
                    FROM users
                    WHERE id IN (${participants.map(() => '?').join(',')})
                `, participants);
            }

            return {
                id: channel.id,
                type: channel.type,
                name: channel.name,
                participants: participants,
                participantDetails: participantDetails,
                lastMessage: lastMessage ? {
                    id: lastMessage.id,
                    channel_id: lastMessage.channel_id,
                    user_id: lastMessage.user_id,
                    user_name: lastMessage.user_name,
                    avatar: lastMessage.avatar,
                    content: lastMessage.content,
                    timestamp: lastMessage.created_at,
                    read_by: safeJsonParse(lastMessage.read_by)
                } : null,
                unreadCount: actualUnreadCount,
                created_at: channel.created_at,
                updated_at: channel.updated_at
            };
        }));

        res.json({ success: true, channels: channelsWithDetails });
    } catch (error) {
        console.error('獲取聊天頻道失敗:', error);
        res.status(500).json({ success: false, error: '獲取聊天頻道失敗' });
    }
});

// 創建一對一聊天頻道
router.post('/channels/direct', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { user1, user2 } = req.body;
        if (!user1 || !user2) return res.status(400).json({ success: false, error: '缺少必要參數' });

        await initChatTables(db);
        const participants = [user1, user2].sort();
        const participantsJson = JSON.stringify(participants);

        const existing = await db.get(`
            SELECT * FROM chat_channels
            WHERE type = 'DIRECT'
            AND participants = ?
        `, [participantsJson]);

        if (existing) {
            const participantDetails = await db.all(`
                SELECT id, name, avatar, department, role
                FROM users
                WHERE id IN (?, ?)
            `, participants);

            return res.json({
                success: true,
                channel: {
                    id: existing.id,
                    type: existing.type,
                    name: existing.name,
                    participants: participants,
                    participantDetails: participantDetails,
                    created_at: existing.created_at
                }
            });
        }

        const channelId = uuidv4();
        const now = new Date().toISOString();
        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at, updated_at)
            VALUES (?, 'DIRECT', NULL, ?, ?, ?)
        `, [channelId, participantsJson, now, now]);

        const participantDetails = await db.all(`
            SELECT id, name, avatar, department, role
            FROM users
            WHERE id IN (?, ?)
        `, participants);

        res.json({
            success: true,
            channel: {
                id: channelId,
                type: 'DIRECT',
                name: null,
                participants: participants,
                participantDetails: participantDetails,
                created_at: now
            }
        });
    } catch (error) {
        console.error('創建一對一頻道失敗:', error);
        res.status(500).json({ success: false, error: '創建聊天頻道失敗' });
    }
});

// 創建群組聊天頻道
router.post('/channels', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { type, name, participant_ids } = req.body;

        if (type !== 'GROUP' || !name || !Array.isArray(participant_ids) || participant_ids.length < 2) {
            return res.status(400).json({ success: false, error: '無效的群組參數' });
        }

        await initChatTables(db);
        const participants = Array.from(new Set([currentUser.id, ...participant_ids]));
        const participantsJson = JSON.stringify(participants);
        const channelId = uuidv4();
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at, updated_at)
            VALUES (?, 'GROUP', ?, ?, ?, ?)
        `, [channelId, name, participantsJson, now, now]);

        const participantDetails = await db.all(`
            SELECT id, name, avatar, department, role
            FROM users
            WHERE id IN (${participants.map(() => '?').join(',')})
        `, participants);

        res.json({
            success: true,
            channel: {
                id: channelId,
                type: 'GROUP',
                name: name,
                participants: participants,
                participantDetails: participantDetails,
                created_at: now
            }
        });
    } catch (error) {
        console.error('創建群組頻道失敗:', error);
        res.status(500).json({ success: false, error: '創建群組頻道失敗' });
    }
});

// 獲取頻道訊息
router.get('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { limit = 50, before, after } = req.query;

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) return res.status(404).json({ success: false, error: '頻道不存在' });

        const participants = safeJsonParse(channel.participants);
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ success: false, error: '無權訪問此頻道' });
        }

        let query = `
            SELECT m.*, u.name as user_name, u.avatar
            FROM chat_messages m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.channel_id = ?
        `;
        const params = [channelId];

        if (before) {
            query += ' AND m.created_at < ?';
            params.push(before);
        } else if (after) {
            query += ' AND m.created_at > ?';
            params.push(after);
        }

        query += ' ORDER BY m.created_at DESC LIMIT ?';
        params.push(parseInt(limit) + 1);

        const messages = await db.all(query, params);
        const hasMore = messages.length > parseInt(limit);
        if (hasMore) messages.pop();

        const formattedMessages = messages.reverse().map(m => ({
            id: m.id,
            channel_id: m.channel_id,
            user_id: m.user_id,
            user_name: m.user_name,
            avatar: m.avatar,
            content: m.content,
            timestamp: m.created_at,
            read_by: safeJsonParse(m.read_by)
        }));

        res.json({ success: true, messages: formattedMessages, hasMore });
    } catch (error) {
        console.error('獲取訊息失敗:', error);
        res.status(500).json({ success: false, error: '獲取訊息失敗' });
    }
});

// 發送訊息
router.post('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { content } = req.body;

        if (!content || content.trim() === '') return res.status(400).json({ success: false, error: '訊息內容不能為空' });

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) return res.status(404).json({ success: false, error: '頻道不存在' });

        const participants = safeJsonParse(channel.participants);
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ success: false, error: '無權在此頻道發送訊息' });
        }

        const messageId = uuidv4();
        const now = new Date().toISOString();
        const readBy = JSON.stringify([currentUser.id]);

        await db.run(`
            INSERT INTO chat_messages (id, channel_id, user_id, content, read_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [messageId, channelId, currentUser.id, content, readBy, now]);

        await db.run('UPDATE chat_channels SET updated_at = ? WHERE id = ?', [now, channelId]);
        const user = await db.get('SELECT name, avatar FROM users WHERE id = ?', [currentUser.id]);

        res.json({
            success: true,
            message: {
                id: messageId,
                channel_id: channelId,
                user_id: currentUser.id,
                user_name: user ? user.name : 'Unknown',
                avatar: user ? user.avatar : null,
                content: content,
                timestamp: now,
                read_by: [currentUser.id]
            }
        });
    } catch (error) {
        console.error('發送訊息失敗:', error);
        res.status(500).json({ success: false, error: '發送訊息失敗' });
    }
});

// 標記訊息為已讀
router.post('/channels/:channelId/read', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) return res.status(404).json({ success: false, error: '頻道不存在' });

        const participants = safeJsonParse(channel.participants);
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ success: false, error: '無權訪問此頻道' });
        }

        const unreadMessages = await db.all(`
            SELECT id, read_by
            FROM chat_messages
            WHERE channel_id = ?
            AND user_id != ?
        `, [channelId, currentUser.id]);

        let markedCount = 0;
        for (const msg of unreadMessages) {
            const readBy = safeJsonParse(msg.read_by);
            if (!readBy.includes(currentUser.id)) {
                readBy.push(currentUser.id);
                await db.run(
                    'UPDATE chat_messages SET read_by = ? WHERE id = ?',
                    [JSON.stringify(readBy), msg.id]
                );
                markedCount++;
            }
        }

        res.json({ success: true, markedCount });
    } catch (error) {
        console.error('標記已讀失敗:', error);
        res.status(500).json({ success: false, error: '標記已讀失敗' });
    }
});

// 收回訊息
router.post('/channels/:channelId/messages/:messageId/recall', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId, messageId } = req.params;

        const message = await db.get(
            'SELECT * FROM chat_messages WHERE id = ? AND channel_id = ?',
            [messageId, channelId]
        );

        if (!message) return res.status(404).json({ success: false, error: '訊息不存在' });
        if (message.user_id !== currentUser.id) return res.status(403).json({ success: false, error: '只能收回自己的訊息' });

        // 不限制收回時間
        await db.run(
            'UPDATE chat_messages SET content = ? WHERE id = ?',
            ['[RECALLED]', messageId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('收回訊息失敗:', error);
        res.status(500).json({ success: false, error: '收回訊息失敗' });
    }
});

// 離開群組
router.post('/channels/:channelId/leave', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) return res.status(404).json({ success: false, error: '頻道不存在' });
        if (channel.type === 'DIRECT') return res.status(400).json({ success: false, error: '無法離開私聊頻道' });

        const participants = safeJsonParse(channel.participants);
        if (!participants.includes(currentUser.id)) return res.status(400).json({ success: false, error: '您不在此群組中' });

        const newParticipants = participants.filter(id => id !== currentUser.id);

        if (newParticipants.length === 0) {
            await db.run('DELETE FROM chat_channels WHERE id = ?', [channelId]);
            await db.run('DELETE FROM chat_messages WHERE channel_id = ?', [channelId]);
        } else {
            await db.run(
                'UPDATE chat_channels SET participants = ? WHERE id = ?',
                [JSON.stringify(newParticipants), channelId]
            );
        }

        res.json({ success: true, message: '已成功離開群組' });
    } catch (error) {
        console.error('離開群組錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器內部錯誤' });
    }
});

// 編輯群組
router.put('/channels/:channelId', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { name, participant_ids } = req.body;

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) return res.status(404).json({ success: false, error: '頻道不存在' });
        if (channel.type === 'DIRECT') return res.status(400).json({ success: false, error: '無法編輯私聊頻道' });

        const currentParticipants = safeJsonParse(channel.participants);
        if (!currentParticipants.includes(currentUser.id)) return res.status(403).json({ success: false, error: '您不在此群組中' });

        const newName = name || channel.name;
        const newParticipants = participant_ids || currentParticipants;
        if (!newParticipants.includes(currentUser.id)) newParticipants.push(currentUser.id);
        const now = new Date().toISOString();

        console.log(`更新群組 ${channelId}:`, { newName, newParticipants });

        await db.run(
            'UPDATE chat_channels SET name = ?, participants = ?, updated_at = ? WHERE id = ?',
            [newName, JSON.stringify(newParticipants), now, channelId]
        );

        const updatedChannel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        res.json({
            success: true,
            channel: {
                id: updatedChannel.id,
                type: updatedChannel.type,
                name: updatedChannel.name,
                participants: safeJsonParse(updatedChannel.participants)
            }
        });
    } catch (error) {
        console.error('編輯群組錯誤:', error);
        res.status(500).json({ success: false, error: '伺服器內部錯誤' });
    }
});

// 獲取聊天用戶列表
router.get('/users', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const users = await db.all(`
            SELECT id, name, avatar, department, role
            FROM users
            ORDER BY name
        `);
        res.json({ success: true, users });
    } catch (error) {
        console.error('獲取用戶列表失敗:', error);
        res.status(500).json({ success: false, error: '獲取用戶列表失敗' });
    }
});

exports.chatRoutes = router;
