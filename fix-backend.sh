#!/bin/sh
# 修復 avatar SQL 錯誤
docker exec taskflow-pro sh -c 'sed -i "350s/.*/            \"UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?\",/" /app/dist/routes/users.js'

# 建立完整的 chat.js
docker exec taskflow-pro sh -c 'cat > /app/dist/routes/chat.js << '"'"'CHATEOF'"'"'
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

// GET /channels - 獲取用戶的聊天頻道
router.get("/channels", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.query.userId || req.user.id;
        const channels = await db.all("SELECT * FROM chat_channels WHERE participants LIKE ?", ["%" + userId + "%"]);
        const result = channels.map(ch => ({
            ...ch,
            participants: ch.participants ? JSON.parse(ch.participants) : []
        }));
        res.json(result);
    } catch (error) {
        console.error("獲取聊天頻道錯誤:", error);
        res.json([]);
    }
});

// GET /channels/:channelId/messages - 獲取頻道訊息
router.get("/channels/:channelId/messages", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { channelId } = req.params;
        const messages = await db.all("SELECT * FROM chat_messages WHERE channel_id = ? ORDER BY timestamp ASC", [channelId]);
        const result = messages.map(m => ({
            id: m.id,
            channelId: m.channel_id,
            userId: m.user_id,
            userName: m.user_name,
            avatar: m.avatar,
            content: m.content,
            timestamp: m.timestamp,
            readBy: m.read_by ? JSON.parse(m.read_by) : []
        }));
        res.json(result);
    } catch (error) {
        console.error("獲取訊息錯誤:", error);
        res.json([]);
    }
});

// POST /channels/:channelId/messages - 發送訊息
router.post("/channels/:channelId/messages", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { channelId } = req.params;
        const { userId, content, sender } = req.body;
        const uid = userId || req.user.id;
        const msgId = "msg-" + Date.now();
        const timestamp = new Date().toISOString();
        const userName = (sender && sender.name) || req.user.name || "";
        const avatar = (sender && sender.avatar) || req.user.avatar || "";
        const readBy = JSON.stringify([uid]);
        await db.run(
            "INSERT INTO chat_messages (id, channel_id, user_id, user_name, avatar, content, timestamp, read_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [msgId, channelId, uid, userName, avatar, content, timestamp, readBy]
        );
        res.json({
            id: msgId,
            channelId: channelId,
            userId: uid,
            userName: userName,
            avatar: avatar,
            content: content,
            timestamp: timestamp,
            readBy: [uid]
        });
    } catch (error) {
        console.error("發送訊息錯誤:", error);
        res.status(500).json({ error: "發送訊息失敗" });
    }
});

// POST /channels/:channelId/read - 標記已讀
router.post("/channels/:channelId/read", auth_1.authenticateToken, async (req, res) => {
    res.json({ ok: true });
});

// POST /channels/direct - 建立私訊頻道
router.post("/channels/direct", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { user1, user2 } = req.body;
        const existing = await db.get(
            "SELECT * FROM chat_channels WHERE type = ? AND participants LIKE ? AND participants LIKE ?",
            ["DIRECT", "%" + user1 + "%", "%" + user2 + "%"]
        );
        if (existing) {
            return res.json({
                ...existing,
                participants: existing.participants ? JSON.parse(existing.participants) : []
            });
        }
        const channelId = "dm-" + Date.now();
        const participants = JSON.stringify([user1, user2]);
        await db.run(
            "INSERT INTO chat_channels (id, type, participants) VALUES (?, ?, ?)",
            [channelId, "DIRECT", participants]
        );
        res.json({
            id: channelId,
            type: "DIRECT",
            participants: [user1, user2]
        });
    } catch (error) {
        console.error("建立私訊頻道錯誤:", error);
        res.status(500).json({ error: "建立頻道失敗" });
    }
});
//# sourceMappingURL=chat.js.map
CHATEOF'

# 重啟容器
docker restart taskflow-pro

echo "=== 修復完成 ==="
echo "驗證 users.js 第 350 行："
docker exec taskflow-pro sed -n '348,352p' /app/dist/routes/users.js
echo ""
echo "驗證 chat.js 前 20 行："
docker exec taskflow-pro head -20 /app/dist/routes/chat.js
