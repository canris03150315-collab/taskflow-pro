"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");

const router = express_1.default.Router();

const uploadsDir = process.env.UPLOADS_PATH || './data/uploads/chat';
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'application/zip', 'application/x-rar-compressed'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('不支援的檔案類型'));
    }
};

const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/channels', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const channels = await db.all(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM chat_messages m 
                    WHERE m.channel_id = c.id AND m.user_id != ? 
                    AND NOT EXISTS (SELECT 1 FROM message_read_status mrs WHERE mrs.message_id = m.id AND mrs.user_id = ?)) as unread_count
            FROM chat_channels c
            INNER JOIN channel_participants cp ON c.id = cp.channel_id
            WHERE cp.user_id = ?
            ORDER BY c.updated_at DESC
        `, [currentUser.id, currentUser.id, currentUser.id]);
        for (const channel of channels) {
            const lastMessage = await db.get(`
                SELECT m.*, u.name as user_name, u.avatar FROM chat_messages m
                LEFT JOIN users u ON m.user_id = u.id WHERE m.channel_id = ?
                ORDER BY m.created_at DESC LIMIT 1
            `, [channel.id]);
            channel.last_message = lastMessage || null;
            const participants = await db.all(`
                SELECT u.id, u.name, u.avatar, u.department FROM users u
                INNER JOIN channel_participants cp ON u.id = cp.user_id WHERE cp.channel_id = ?
            `, [channel.id]);
            channel.participants = participants;
        }
        res.json({ channels });
    } catch (error) {
        console.error('獲取聊天頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

router.post('/channels', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { name, type, participant_ids } = req.body;
        const channelId = `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        if (type === 'direct' && participant_ids && participant_ids.length === 1) {
            const otherUserId = participant_ids[0];
            const existing = await db.get(`
                SELECT c.id FROM chat_channels c WHERE c.type = 'direct'
                AND EXISTS (SELECT 1 FROM channel_participants WHERE channel_id = c.id AND user_id = ?)
                AND EXISTS (SELECT 1 FROM channel_participants WHERE channel_id = c.id AND user_id = ?)
            `, [currentUser.id, otherUserId]);
            if (existing) {
                const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [existing.id]);
                return res.json({ channel, existing: true });
            }
        }
        await db.run(`INSERT INTO chat_channels (id, name, type, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [channelId, name || '', type || 'direct', currentUser.id, now, now]);
        const allParticipants = [currentUser.id, ...(participant_ids || [])];
        for (const participantId of allParticipants) {
            await db.run(`INSERT OR IGNORE INTO channel_participants (channel_id, user_id, joined_at) VALUES (?, ?, ?)`,
                [channelId, participantId, now]);
        }
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        res.json({ channel });
    } catch (error) {
        console.error('創建頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

router.post('/channels/direct', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { user1, user2 } = req.body;
        const existing = await db.get(`
            SELECT c.id FROM chat_channels c WHERE c.type = 'direct'
            AND EXISTS (SELECT 1 FROM channel_participants WHERE channel_id = c.id AND user_id = ?)
            AND EXISTS (SELECT 1 FROM channel_participants WHERE channel_id = c.id AND user_id = ?)
        `, [user1, user2]);
        if (existing) {
            const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [existing.id]);
            const participants = await db.all(`SELECT user_id FROM channel_participants WHERE channel_id = ?`, [channel.id]);
            channel.participants = participants.map(p => p.user_id);
            return res.json({ channel, existing: true });
        }
        const channelId = `dm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        await db.run(`INSERT INTO chat_channels (id, name, type, created_by, created_at, updated_at) VALUES (?, ?, 'direct', ?, ?, ?)`,
            [channelId, '', currentUser.id, now, now]);
        await db.run(`INSERT OR IGNORE INTO channel_participants (channel_id, user_id, joined_at) VALUES (?, ?, ?)`, [channelId, user1, now]);
        await db.run(`INSERT OR IGNORE INTO channel_participants (channel_id, user_id, joined_at) VALUES (?, ?, ?)`, [channelId, user2, now]);
        res.json({ channel: { id: channelId, name: '', type: 'direct', participants: [user1, user2], created_at: now, updated_at: now } });
    } catch (error) {
        console.error('創建直接頻道錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

router.get('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { limit = '50', before, after } = req.query;
        const isParticipant = await db.get(`SELECT 1 FROM channel_participants WHERE channel_id = ? AND user_id = ?`, [channelId, currentUser.id]);
        if (!isParticipant) return res.status(403).json({ error: '您不是此頻道的參與者' });
        let query = `SELECT m.*, u.name as user_name, u.avatar FROM chat_messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.channel_id = ?`;
        const params = [channelId];
        if (before) { query += ' AND m.created_at < ?'; params.push(before); }
        if (after) { query += ' AND m.created_at > ?'; params.push(after); }
        query += ' ORDER BY m.created_at DESC LIMIT ?';
        params.push(parseInt(limit) + 1);
        const messages = await db.all(query, params);
        const hasMore = messages.length > parseInt(limit);
        if (hasMore) messages.pop();
        for (const msg of messages) {
            await db.run(`INSERT OR IGNORE INTO message_read_status (message_id, user_id, read_at) VALUES (?, ?, ?)`,
                [msg.id, currentUser.id, new Date().toISOString()]);
            const readBy = await db.all(`SELECT user_id FROM message_read_status WHERE message_id = ?`, [msg.id]);
            msg.read_by = JSON.stringify(readBy.map(r => r.user_id));
        }
        res.json({ messages: messages.reverse(), hasMore });
    } catch (error) {
        console.error('獲取訊息錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

router.post('/channels/:channelId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { content } = req.body;
        if (!content || !content.trim()) return res.status(400).json({ error: '訊息內容不能為空' });
        const isParticipant = await db.get(`SELECT 1 FROM channel_participants WHERE channel_id = ? AND user_id = ?`, [channelId, currentUser.id]);
        if (!isParticipant) return res.status(403).json({ error: '您不是此頻道的參與者' });
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        await db.run(`INSERT INTO chat_messages (id, channel_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)`,
            [messageId, channelId, currentUser.id, content.trim(), now]);
        await db.run(`UPDATE chat_channels SET updated_at = ? WHERE id = ?`, [now, channelId]);
        await db.run(`INSERT OR IGNORE INTO message_read_status (message_id, user_id, read_at) VALUES (?, ?, ?)`, [messageId, currentUser.id, now]);
        const user = await db.get('SELECT name, avatar FROM users WHERE id = ?', [currentUser.id]);
        res.json({ message: { id: messageId, channel_id: channelId, user_id: currentUser.id, user_name: user?.name || currentUser.name, avatar: user?.avatar, content: content.trim(), created_at: now } });
    } catch (error) {
        console.error('發送訊息錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

router.post('/channels/:channelId/read', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const messages = await db.all(`SELECT id FROM chat_messages WHERE channel_id = ?`, [channelId]);
        const now = new Date().toISOString();
        for (const msg of messages) {
            await db.run(`INSERT OR IGNORE INTO message_read_status (message_id, user_id, read_at) VALUES (?, ?, ?)`, [msg.id, currentUser.id, now]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('標記已讀錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

router.get('/users', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const users = await db.all(`SELECT id, name, avatar, department, role FROM users WHERE id != ? AND is_active = 1 ORDER BY name`, [currentUser.id]);
        res.json({ users });
    } catch (error) {
        console.error('獲取用戶列表錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

router.post('/upload', auth_1.authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: '未提供檔案' });
        const file = req.file;
        const isImage = file.mimetype.startsWith('image/');
        const fileUrl = `/uploads/chat/${file.filename}`;
        res.json({ success: true, file: { url: fileUrl, filename: file.filename, originalName: file.originalname, size: file.size, mimetype: file.mimetype, isImage } });
    } catch (error) {
        console.error('檔案上傳錯誤:', error);
        res.status(500).json({ error: '檔案上傳失敗' });
    }
});

router.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: '檔案大小超過限制 (最大 10MB)' });
    if (err) return res.status(400).json({ error: err.message });
    next();
});

exports.chatRoutes = router;
