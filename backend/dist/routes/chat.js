"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// ??????????
async function initChatTables(db) {
    // ?????
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

    // ?????
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

    // ???????????
    await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_channel ON chat_messages(channel_id, created_at DESC)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_user ON chat_messages(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_channels_participants ON chat_channels(participants)`);
}

// ???????????
router.get('/channels', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;

        await initChatTables(db);

        // ?????????????
        const channels = await db.all(`
            SELECT * FROM chat_channels 
            WHERE participants LIKE '%' || ? || '%'
            ORDER BY updated_at DESC
        `, [currentUser.id]);

        // ?????????????????
        const channelsWithDetails = await Promise.all(channels.map(async (channel) => {
            let participants = [];
            try {
                participants = typeof channel.participants === 'string' 
                    ? JSON.parse(channel.participants) 
                    : (channel.participants || []);
            } catch (e) {
                participants = [];
            }
            
            // ????????
            const lastMessage = await db.get(`
                SELECT m.*, u.name as user_name, u.avatar
                FROM chat_messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.channel_id = ?
                ORDER BY m.created_at DESC
                LIMIT 1
            `, [channel.id]);

            // ???????
            const unreadCount = await db.get(`
                SELECT COUNT(*) as count
                FROM chat_messages
                WHERE channel_id = ?
                AND user_id != ?
                AND NOT (read_by LIKE '%' || ? || '%')
            `, [channel.id, currentUser.id, currentUser.id]);

            // ?????????
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
                    read_by: JSON.parse(lastMessage.read_by || '[]')
                } : null,
                unreadCount: unreadCount.count,
                created_at: channel.created_at,
                updated_at: channel.updated_at
            };
        }));

        res.json({ channels: channelsWithDetails });
    } catch (error) {
        console.error('????????:', error);
        res.status(500).json({ error: '????????' });
    }
});

// ?????????
router.post('/channels/direct', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { user1, user2 } = req.body;

        if (!user1 || !user2) {
            return res.status(400).json({ error: '缺少必要參數 user1 和 user2' });
        }

        await initChatTables(db);

        // ?????????????
        const participants = [user1, user2].sort();
        const participantsJson = JSON.stringify(participants);

        const existing = await db.get(`
            SELECT * FROM chat_channels
            WHERE type = 'DIRECT'
            AND participants = ?
        `, [participantsJson]);

        if (existing) {
            // ??????
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

        // ?????
        const channelId = uuidv4();
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at, updated_at)
            VALUES (?, 'DIRECT', NULL, ?, ?, ?)
        `, [channelId, participantsJson, now, now]);

        // ?????????
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
        console.error('建立私聊錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// 建立頻道
router.post('/channels', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { type, name, participant_ids } = req.body;

        if (type !== 'GROUP' || !name || !Array.isArray(participant_ids) || participant_ids.length < 2) {
            return res.status(400).json({ error: '請提供 type:"GROUP"、name、participant_ids（至少2人）' });
        }

        await initChatTables(db);

        // 確保參與者包含自己
        const participants = Array.from(new Set([currentUser.id, ...participant_ids]));
        const participantsJson = JSON.stringify(participants);

        const channelId = uuidv4();
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at, updated_at)
            VALUES (?, 'GROUP', ?, ?, ?, ?)
        `, [channelId, name, participantsJson, now, now]);

        // ?????????
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
        console.error('建立頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// 取得頻道訊息
router.get('/channels/:channelId/messages', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { limit = 50, before, after } = req.query;

        await initChatTables(db);

        // ???????????
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        let participants = [];
        try {
            participants = typeof channel.participants === 'string' 
                ? JSON.parse(channel.participants) 
                : (channel.participants || []);
        } catch (e) {
            participants = [];
        }

        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '???????' });
        }

        // ????
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

        // ???????????
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
        console.error('??????:', error);
        res.status(500).json({ error: '??????' });
    }
});

// ????
router.post('/channels/:channelId/messages', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: '????????' });
        }

        await initChatTables(db);

        // ???????????
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        let participants = [];
        try {
            participants = typeof channel.participants === 'string' 
                ? JSON.parse(channel.participants) 
                : (channel.participants || []);
        } catch (e) {
            participants = [];
        }

        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '??????????' });
        }

        // ????
        const messageId = uuidv4();
        const now = new Date().toISOString();
        const readBy = JSON.stringify([currentUser.id]); // ???????

        await db.run(`
            INSERT INTO chat_messages (id, channel_id, user_id, content, read_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [messageId, channelId, currentUser.id, content, readBy, now]);

        // ????? updated_at
        await db.run('UPDATE chat_channels SET updated_at = ? WHERE id = ?', [now, channelId]);

        // ??????
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

        // ?? WebSocket ???????????
        try {
            const { broadcastMessage } = require('../websocket');
            broadcastMessage(channelId, message);
        } catch (wsError) {
            console.error('WebSocket ????:', wsError);
        }
    } catch (error) {
        console.error('??????:', error);
        res.status(500).json({ error: '??????' });
    }
});

// ???????
router.post('/channels/:channelId/read', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;

        await initChatTables(db);

        // ???????????
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        let participants = [];
        try {
            participants = typeof channel.participants === 'string' 
                ? JSON.parse(channel.participants) 
                : (channel.participants || []);
        } catch (e) {
            participants = [];
        }

        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '???????' });
        }

        // ????????
        const unreadMessages = await db.all(`
            SELECT id, read_by
            FROM chat_messages
            WHERE channel_id = ?
            AND user_id != ?
            AND NOT (read_by LIKE '%' || ? || '%')
        `, [channelId, currentUser.id, currentUser.id]);

        // ??????? read_by
        for (const msg of unreadMessages) {
            let readBy = [];
            try {
                readBy = typeof msg.read_by === 'string' ? JSON.parse(msg.read_by) : (msg.read_by || []);
            } catch (e) {
                readBy = [];
            }
            
            if (!readBy.includes(currentUser.id)) {
                readBy.push(currentUser.id);
                await db.run(
                    'UPDATE chat_messages SET read_by = ? WHERE id = ?',
                    [JSON.stringify(readBy), msg.id]
                );
            }
        }

        res.json({ success: true, markedCount: unreadMessages.length });

        // ?? WebSocket ????????????
        try {
            const { broadcastReadStatus } = require('../websocket');
            broadcastReadStatus(channelId, {
                channelId,
                userId: currentUser.id,
                messageIds: unreadMessages.map(m => m.id)
            });
        } catch (wsError) {
            console.error('WebSocket ????????:', wsError);
        }
    } catch (error) {
        console.error('??????:', error);
        res.status(500).json({ error: '??????' });
    }
});

// ????
router.post('/channels/:channelId/messages/:messageId/recall', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId, messageId } = req.params;

        await initChatTables(db);

        // ????
        const message = await db.get(
            'SELECT * FROM chat_messages WHERE id = ? AND channel_id = ?',
            [messageId, channelId]
        );

        if (!message) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        // ???????????
        if (message.user_id !== currentUser.id) {
            return res.status(403).json({ error: '?????????' });
        }

        // ??????? 100 ?? (?????)
        const messageTime = new Date(message.created_at).getTime();
        const now = new Date().getTime();
        const timeLimit = 100 * 365 * 24 * 60 * 60 * 1000; // 100 years

        if (now - messageTime > timeLimit) {
            return res.status(400).json({ error: '???? 100 ?????' });
        }

        // ????????????
        await db.run(
            'UPDATE chat_messages SET content = ? WHERE id = ?',
            ['[RECALLED]', messageId]
        );

        res.json({ success: true });

        // ?? WebSocket ???????????
        try {
            const { broadcastMessageRecall } = require('../websocket');
            broadcastMessageRecall(message.channel_id, messageId);
        } catch (wsError) {
            console.error('WebSocket ????????:', wsError);
        }
    } catch (error) {
        console.error('??????:', error);
        res.status(500).json({ error: '??????' });
    }
});

// ????
router.post('/channels/:channelId/leave', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        if (channel.type === 'DIRECT') {
            return res.status(400).json({ error: '????????' });
        }

        let participants = [];
        try {
            participants = typeof channel.participants === 'string' 
                ? JSON.parse(channel.participants) 
                : (channel.participants || []);
        } catch (e) {
            participants = [];
        }

        if (!participants.includes(currentUser.id)) {
            return res.status(400).json({ error: '???????' });
        }

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

        res.json({ success: true, message: '???????' });
    } catch (error) {
        console.error('??????:', error);
        res.status(500).json({ error: '???????' });
    }
});

// ????
router.put('/channels/:channelId', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { name, participant_ids } = req.body;

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        if (channel.type === 'DIRECT') {
            return res.status(400).json({ error: '????????' });
        }

        let currentParticipants = [];
        try {
            currentParticipants = typeof channel.participants === 'string' 
                ? JSON.parse(channel.participants) 
                : (channel.participants || []);
        } catch (e) {
            currentParticipants = [];
        }

        if (!currentParticipants.includes(currentUser.id)) {
            return res.status(403).json({ error: '???????' });
        }

        const newName = name || channel.name;
        const newParticipants = participant_ids || currentParticipants;

        if (!newParticipants.includes(currentUser.id)) {
            newParticipants.push(currentUser.id);
        }

        await db.run(
            'UPDATE chat_channels SET name = ?, participants = ? WHERE id = ?',
            [newName, JSON.stringify(newParticipants), channelId]
        );

        // Notify removed members via WebSocket
        try {
            const removedMembers = currentParticipants.filter(id => !newParticipants.includes(id));
            if (removedMembers.length > 0) {
                const wsServer = req.app.get('wsServer');
                if (wsServer) {
                    removedMembers.forEach(userId => {
                        const client = wsServer.clients.get(userId);
                        if (client && client.readyState === 1) {
                            client.send(JSON.stringify({
                                type: 'kicked_from_channel',
                                payload: {
                                    channelId: channelId,
                                    message: '\u4F60\u5DF2\u88AB\u79FB\u51FA\u7FA4\u7D44'
                                }
                            }));
                        }
                    });
                    console.log(`\u{1F6AB} \u79FB\u9664 ${removedMembers.length} \u6210\u54E1\u5F9E\u7FA4\u7D44 ${channelId}`);
                }
            }
        } catch (kickError) {
            console.error('Kick notification error:', kickError);
        }

        const updatedChannel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        
        res.json({ 
            success: true, 
            channel: {
                id: updatedChannel.id,
                type: updatedChannel.type,
                name: updatedChannel.name,
                participants: JSON.parse(updatedChannel.participants)
            }
        });

        // ?? WebSocket ??????
        try {
            const { broadcastChannelUpdate } = require('../websocket');
            broadcastChannelUpdate(channelId, {
                channelId,
                name: newName,
                participants: newParticipants
            });
        } catch (wsError) {
            console.error('WebSocket ????????:', wsError);
        }
    } catch (error) {
        console.error('??????:', error);
        res.status(500).json({ error: '???????' });
    }
});

// ????????
router.get('/users', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const users = await db.all(`
            SELECT id, name, avatar, department, role
            FROM users
            ORDER BY name
        `);
        res.json({ users });
    } catch (error) {
        console.error('????????:', error);
        res.status(500).json({ error: '????????' });
    }
});

// ??????????????
router.delete('/channels/:channelId', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        let participants = [];
        try {
            participants = typeof channel.participants === 'string' 
                ? JSON.parse(channel.participants) 
                : (channel.participants || []);
        } catch (e) {
            participants = [];
        }

        // ????????????
        if (!participants.includes(currentUser.id)) {
            return res.status(403).json({ error: '????????' });
        }

        // ?????????
        await db.run('DELETE FROM chat_channels WHERE id = ?', [channelId]);
        await db.run('DELETE FROM chat_messages WHERE channel_id = ?', [channelId]);

        res.json({ success: true, message: '??????' });
    } catch (error) {
        console.error('???????:', error);
        res.status(500).json({ error: '???????' });
    }
});

exports.chatRoutes = router;

