"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const auth_1 = require("../middleware/auth");

const router = express.Router();

// ????憭拙恕鞈?摨怨”
async function initChatTables(db) {
    // ?予?駁?銵?
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

    // ?予閮銵?
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

    // ?萄遣蝝Ｗ?隞交??閰Ｘ???
    await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_channel ON chat_messages(channel_id, created_at DESC)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_user ON chat_messages(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_channels_participants ON chat_channels(participants)`);
}

// ?脣??冽????憭拚??
router.get('/channels', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;

        await initChatTables(db);

        // ?亥岷??嗅??冽?????
        const channels = await db.all(`
            SELECT * FROM chat_channels 
            WHERE participants LIKE '%' || ? || '%'
            ORDER BY updated_at DESC
        `, [currentUser.id]);

        // ?箸?????敺?璇??臬??芾???
        const channelsWithDetails = await Promise.all(channels.map(async (channel) => {
            let participants = [];
            try {
                participants = typeof channel.participants === 'string' 
                    ? JSON.parse(channel.participants) 
                    : (channel.participants || []);
            } catch (e) {
                participants = [];
            }
            
            // ?脣??敺?璇???
            const lastMessage = await db.get(`
                SELECT m.*, u.name as user_name, u.avatar
                FROM chat_messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.channel_id = ?
                ORDER BY m.created_at DESC
                LIMIT 1
            `, [channel.id]);

            // 閮??芾?閮??
            const unreadCount = await db.get(`
                SELECT COUNT(*) as count
                FROM chat_messages
                WHERE channel_id = ?
                AND user_id != ?
                AND NOT (read_by LIKE '%' || ? || '%')
            `, [channel.id, currentUser.id, currentUser.id]);

            // ?脣????底蝝啗?閮?
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
        console.error('?脣??予?駁?憭望?:', error);
        res.status(500).json({ error: '?脣??予?駁?憭望?' });
    }
});

// ?萄遣銝撠??予?駁?
router.post('/channels/direct', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { user1, user2 } = req.body;

        if (!user1 || !user2) {
            return res.status(400).json({ error: '蝻箏?敹??' });
        }

        await initChatTables(db);

        // 瑼Ｘ?臬撌脣??刻府銝撠??駁?
        const participants = [user1, user2].sort();
        const participantsJson = JSON.stringify(participants);

        const existing = await db.get(`
            SELECT * FROM chat_channels
            WHERE type = 'DIRECT'
            AND participants = ?
        `, [participantsJson]);

        if (existing) {
            // 餈??暹??駁?
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

        // ?萄遣?圈??
        const channelId = uuidv4();
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at, updated_at)
            VALUES (?, 'DIRECT', NULL, ?, ?, ?)
        `, [channelId, participantsJson, now, now]);

        // ?脣????底蝝啗?閮?
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
        console.error('?萄遣銝撠??駁?憭望?:', error);
        res.status(500).json({ error: '?萄遣?予?駁?憭望?' });
    }
});

// ?萄遣蝢斤??予?駁?
router.post('/channels', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { type, name, participant_ids } = req.body;

        if (type !== 'GROUP' || !name || !Array.isArray(participant_ids) || participant_ids.length < 2) {
            return res.status(400).json({ error: '?⊥??黎蝯??? });
        }

        await initChatTables(db);

        // 蝣箔??萄遣?????銵其葉
        const participants = Array.from(new Set([currentUser.id, ...participant_ids]));
        const participantsJson = JSON.stringify(participants);

        const channelId = uuidv4();
        const now = new Date().toISOString();

        await db.run(`
            INSERT INTO chat_channels (id, type, name, participants, created_at, updated_at)
            VALUES (?, 'GROUP', ?, ?, ?, ?)
        `, [channelId, name, participantsJson, now, now]);

        // ?脣????底蝝啗?閮?
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
        console.error('?萄遣蝢斤??駁?憭望?:', error);
        res.status(500).json({ error: '?萄遣蝢斤??駁?憭望?' });
    }
});

// ?脣??駁?閮嚗?游???
router.get('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { limit = 50, before, after } = req.query;

        await initChatTables(db);

        // 撽??冽?臬?粹????
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '?駁?銝??? });
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
            return res.status(403).json({ error: '?⊥?閮芸?甇日?? });
        }

        // 瑽遣?亥岷
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

        // ????嚗????典?嚗?
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
        console.error('?脣?閮憭望?:', error);
        res.status(500).json({ error: '?脣?閮憭望?' });
    }
});

// ?潮???
router.post('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: '閮?批捆銝?箇征' });
        }

        await initChatTables(db);

        // 撽??冽?臬?粹????
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '?駁?銝??? });
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
            return res.status(403).json({ error: '?⊥??冽迨?駁??潮??? });
        }

        // ?萄遣閮
        const messageId = uuidv4();
        const now = new Date().toISOString();
        const readBy = JSON.stringify([currentUser.id]); // ?潮?歇霈

        await db.run(`
            INSERT INTO chat_messages (id, channel_id, user_id, content, read_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [messageId, channelId, currentUser.id, content, readBy, now]);

        // ?湔?駁???updated_at
        await db.run('UPDATE chat_channels SET updated_at = ? WHERE id = ?', [now, channelId]);

        // ?脣??冽鞈?
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

        // TODO: ?? WebSocket 撱??啗??舐策?嗡?????
    } catch (error) {
        console.error('?潮??臬仃??', error);
        res.status(500).json({ error: '?潮??臬仃?? });
    }
});

// 璅?閮?箏歇霈
router.post('/channels/:channelId/read', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;

        await initChatTables(db);

        // 撽??冽?臬?粹????
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '?駁?銝??? });
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
            return res.status(403).json({ error: '?⊥?閮芸?甇日?? });
        }

        // ?脣???霈閮
        const unreadMessages = await db.all(`
            SELECT id, read_by
            FROM chat_messages
            WHERE channel_id = ?
            AND user_id != ?
            AND NOT (read_by LIKE '%' || ? || '%')
        `, [channelId, currentUser.id, currentUser.id]);

        // ?湔瘥?閮??read_by
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

        // TODO: ?? WebSocket ??嗡??冽撌脰?????
    } catch (error) {
        console.error('璅?撌脰?憭望?:', error);
        res.status(500).json({ error: '璅?撌脰?憭望?' });
    }
});

// ?嗅?閮
router.post('/channels/:channelId/messages/:messageId/recall', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId, messageId } = req.params;

        await initChatTables(db);

        // ?脣?閮
        const message = await db.get(
            'SELECT * FROM chat_messages WHERE id = ? AND channel_id = ?',
            [messageId, channelId]
        );

        if (!message) {
            return res.status(404).json({ error: '閮銝??? });
        }

        // ?芣?閮?潮隞交??
        if (message.user_id !== currentUser.id) {
            return res.status(403).json({ error: '?芾?嗅??芸楛???? });
        }

        // 瑼Ｘ閮?臬??100 撟游 (撖西釭?⊿???
        const messageTime = new Date(message.created_at).getTime();
        const now = new Date().getTime();
        const timeLimit = 100 * 365 * 24 * 60 * 60 * 1000; // 100 years

        if (now - messageTime > timeLimit) {
            return res.status(400).json({ error: '?芾?嗅? 100 撟游???? });
        }

        // ?湔閮?批捆?箏歇?嗅?璅?
        await db.run(
            'UPDATE chat_messages SET content = ? WHERE id = ?',
            ['[RECALLED]', messageId]
        );

        res.json({ success: true });

        // TODO: ?? WebSocket ??嗡??冽閮撌脫??
    } catch (error) {
        console.error('?嗅?閮憭望?:', error);
        res.status(500).json({ error: '?嗅?閮憭望?' });
    }
});

// ?ａ?蝢斤?
router.post('/channels/:channelId/leave', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '?駁?銝??? });
        }

        if (channel.type === 'DIRECT') {
            return res.status(400).json({ error: '?⊥??ａ?蝘??駁?' });
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
            return res.status(400).json({ error: '?其??冽迨蝢斤?銝? });
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

        res.json({ success: true, message: '撌脫???黎蝯? });
    } catch (error) {
        console.error('?ａ?蝢斤??航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});

// 蝺刻摩蝢斤?
router.put('/channels/:channelId', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { name, participant_ids } = req.body;

        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '?駁?銝??? });
        }

        if (channel.type === 'DIRECT') {
            return res.status(400).json({ error: '?⊥?蝺刻摩蝘??駁?' });
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
            return res.status(403).json({ error: '?其??冽迨蝢斤?銝? });
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
    } catch (error) {
        console.error('蝺刻摩蝢斤??航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});

// ?脣??予?冽?”
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
        console.error('?脣??冽?”憭望?:', error);
        res.status(500).json({ error: '?脣??冽?”憭望?' });
    }
});

exports.chatRoutes = router;
