"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const auth_1 = require("../middleware/auth");

const router = express.Router();

// 初始化聊天室資料庫表
async function initChatTables(db) {
    // 聊天頻道表
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

    // 聊天訊息表
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

    // 創建索引以提升查詢效能
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

        // 查詢包含當前用戶的所有頻道
        const channels = await db.all(`
            SELECT * FROM chat_channels 
            WHERE participants LIKE '%' || ? || '%'
            ORDER BY updated_at DESC
        `, [currentUser.id]);

        // 為每個頻道獲取最後一條訊息和未讀數
        const channelsWithDetails = await Promise.all(channels.map(async (channel) => {
            const participants = JSON.parse(channel.participants);
            
            // 獲取最後一條訊息
            const lastMessage = await db.get(`
                SELECT m.*, u.name as user_name, u.avatar
                FROM chat_messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.channel_id = ?
                ORDER BY m.created_at DESC
                LIMIT 1
            `, [channel.id]);

            // 計算未讀訊息數
            const unreadCount = await db.get(`
                SELECT COUNT(*) as count
                FROM chat_messages
                WHERE channel_id = ?
                AND user_id != ?
                AND NOT (read_by LIKE '%' || ? || '%')
            `, [channel.id, currentUser.id, currentUser.id]);

            // 獲取參與者詳細資訊
            const participantDetails = await db.all(`
                SELECT id, name, avatar, department, role
                FROM users
                WHERE id IN (${participants.map(() => '?').join(',')})
            `, participants);

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
                    read_by: JSON.parse(lastMessage.read_by || '[]')
                } : null,
                unreadCount: unreadCount.count,
                created_at: channel.created_at,
                updated_at: channel.updated_at
            };
        }));

        res.json({ channels: channelsWithDetails });
    } catch (error) {
        console.error('獲取聊天頻道失敗:', error);
        res.status(500).json({ error: '獲取聊天頻道失敗' });
    }
});

// 創建一對一聊天頻道
router.post('/channels/direct', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { user1, user2 } = req.body;

        if (!user1 || !user2) {
            return res.status(400).json({ error: '缺少必要參數' });
        }

        await initChatTables(db);

        // 檢查是否已存在該一對一頻道
        const participants = [user1, user2].sort();
        const participantsJson = JSON.stringify(participants);

        const existing = await db.get(`
            SELECT * FROM chat_channels
            WHERE type = 'DIRECT'
            AND participants = ?
        `, [participantsJson]);

        if (existing) {
            // 返回現有頻道
            const participantDetails = await db.all(`
                SELECT id, name, avatar, department, role
                FROM users
                WHERE id IN (?, ?)
            `, participants);

            return res.json({
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

        // 創建新頻道
        const channelId = uuidv4();
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at, updated_at)
            VALUES (?, 'DIRECT', NULL, ?, ?, ?)
        `, [channelId, participantsJson, now, now]);

        // 獲取參與者詳細資訊
        const participantDetails = await db.all(`
            SELECT id, name, avatar, department, role
            FROM users
            WHERE id IN (?, ?)
        `, participants);

        res.json({
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
        res.status(500).json({ error: '創建聊天頻道失敗' });
    }
});

// 創建群組聊天頻道
router.post('/channels', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { type, name, participant_ids } = req.body;

        if (type !== 'GROUP' || !name || !Array.isArray(participant_ids) || participant_ids.length < 2) {
            return res.status(400).json({ error: '無效的群組參數' });
        }

        await initChatTables(db);

        // 確保創建者在參與者列表中
        const participants = Array.from(new Set([currentUser.id, ...participant_ids]));
        const participantsJson = JSON.stringify(participants);

        const channelId = uuidv4();
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at, updated_at)
            VALUES (?, 'GROUP', ?, ?, ?, ?)
        `, [channelId, name, participantsJson, now, now]);

        // 獲取參與者詳細資訊
        const participantDetails = await db.all(`
            SELECT id, name, avatar, department, role
            FROM users
            WHERE id IN (${participants.map(() => '?').join(',')})
        `, participants);

        res.json({
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
        res.status(500).json({ error: '創建群組頻道失敗' });
    }
});

// 獲取頻道訊息（支援分頁）
router.get('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { limit = 50, before, after } = req.query;

        await initChatTables(db);

        // 驗證用戶是否為頻道成員
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        const participants = JSON.parse(channel.participants);
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '無權訪問此頻道' });
        }

        // 構建查詢
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
        
        if (hasMore) {
            messages.pop();
        }

        // 反轉順序（最舊的在前）
        const formattedMessages = messages.reverse().map(m => ({
            id: m.id,
            channel_id: m.channel_id,
            user_id: m.user_id,
            user_name: m.user_name,
            avatar: m.avatar,
            content: m.content,
            timestamp: m.created_at,
            read_by: JSON.parse(m.read_by || '[]')
        }));

        res.json({ messages: formattedMessages, hasMore });
    } catch (error) {
        console.error('獲取訊息失敗:', error);
        res.status(500).json({ error: '獲取訊息失敗' });
    }
});

// 發送訊息
router.post('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: '訊息內容不能為空' });
        }

        await initChatTables(db);

        // 驗證用戶是否為頻道成員
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        const participants = JSON.parse(channel.participants);
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '無權在此頻道發送訊息' });
        }

        // 創建訊息
        const messageId = uuidv4();
        const now = new Date().toISOString();
        const readBy = JSON.stringify([currentUser.id]); // 發送者自動已讀

        await db.run(`
            INSERT INTO chat_messages (id, channel_id, user_id, content, read_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [messageId, channelId, currentUser.id, content, readBy, now]);

        // 更新頻道的 updated_at
        await db.run('UPDATE chat_channels SET updated_at = ? WHERE id = ?', [now, channelId]);

        // 獲取用戶資訊
        const user = await db.get('SELECT name, avatar FROM users WHERE id = ?', [currentUser.id]);

        const message = {
            id: messageId,
            channel_id: channelId,
            user_id: currentUser.id,
            user_name: user.name,
            avatar: user.avatar,
            content: content,
            timestamp: now,
            read_by: [currentUser.id]
        };

        res.json({ message });

        // TODO: 通過 WebSocket 廣播新訊息給其他參與者
    } catch (error) {
        console.error('發送訊息失敗:', error);
        res.status(500).json({ error: '發送訊息失敗' });
    }
});

// 標記訊息為已讀
router.post('/channels/:channelId/read', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;

        await initChatTables(db);

        // 驗證用戶是否為頻道成員
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        const participants = JSON.parse(channel.participants);
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '無權訪問此頻道' });
        }

        // 獲取所有未讀訊息
        const unreadMessages = await db.all(`
            SELECT id, read_by
            FROM chat_messages
            WHERE channel_id = ?
            AND user_id != ?
            AND NOT (read_by LIKE '%' || ? || '%')
        `, [channelId, currentUser.id, currentUser.id]);

        // 更新每條訊息的 read_by
        for (const msg of unreadMessages) {
            const readBy = JSON.parse(msg.read_by || '[]');
            if (!readBy.includes(currentUser.id)) {
                readBy.push(currentUser.id);
                await db.run(
                    'UPDATE chat_messages SET read_by = ? WHERE id = ?',
                    [JSON.stringify(readBy), msg.id]
                );
            }
        }

        res.json({ success: true, markedCount: unreadMessages.length });

        // TODO: 通過 WebSocket 通知其他用戶已讀狀態更新
    } catch (error) {
        console.error('標記已讀失敗:', error);
        res.status(500).json({ error: '標記已讀失敗' });
    }
});

// 收回訊息
router.post('/channels/:channelId/messages/:messageId/recall', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId, messageId } = req.params;

        await initChatTables(db);

        // 獲取訊息
        const message = await db.get(
            'SELECT * FROM chat_messages WHERE id = ? AND channel_id = ?',
            [messageId, channelId]
        );

        if (!message) {
            return res.status(404).json({ error: '訊息不存在' });
        }

        // 只有訊息發送者可以收回
        if (message.user_id !== currentUser.id) {
            return res.status(403).json({ error: '只能收回自己的訊息' });
        }

        // 檢查訊息是否在 2 分鐘內
        const messageTime = new Date(message.created_at).getTime();
        const now = new Date().getTime();
        const twoMinutes = 2 * 60 * 1000;

        if (now - messageTime > twoMinutes) {
            return res.status(400).json({ error: '只能收回 2 分鐘內的訊息' });
        }

        // 更新訊息內容為已收回標記
        await db.run(
            'UPDATE chat_messages SET content = ? WHERE id = ?',
            ['[RECALLED]', messageId]
        );

        res.json({ success: true });

        // TODO: 通過 WebSocket 通知其他用戶訊息已收回
    } catch (error) {
        console.error('收回訊息失敗:', error);
        res.status(500).json({ error: '收回訊息失敗' });
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

        res.json({ users });
    } catch (error) {
        console.error('獲取用戶列表失敗:', error);
        res.status(500).json({ error: '獲取用戶列表失敗' });
    }
});

exports.chatRoutes = router;
