// 添加收回訊息 API 到後端
// 這個腳本會被複製到 Docker 容器並執行

const fs = require('fs');
const path = '/app/dist/routes/chat.js';

// 讀取現有的 chat.js
let content = fs.readFileSync(path, 'utf8');

// 檢查是否已有 recall 路由
if (content.includes('/recall')) {
    console.log('Recall API already exists');
    process.exit(0);
}

// 在 exports.chatRoutes = router; 之前插入 recall 路由
const recallRoute = `
// POST /api/chat/channels/:channelId/messages/:messageId/recall - 收回訊息
router.post('/channels/:channelId/messages/:messageId/recall', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId, messageId } = req.params;
        
        // 檢查訊息是否存在且為當前用戶所發
        const message = await db.get('SELECT * FROM chat_messages WHERE id = ? AND channel_id = ?', [messageId, channelId]);
        if (!message) {
            return res.status(404).json({ error: '訊息不存在' });
        }
        
        // 檢查是否為發送者
        if (message.user_id !== currentUser.id) {
            return res.status(403).json({ error: '只能收回自己的訊息' });
        }
        
        // 更新訊息內容為 [RECALLED]
        await db.run('UPDATE chat_messages SET content = ? WHERE id = ?', ['[RECALLED]', messageId]);
        
        res.json({ success: true, message: '訊息已收回' });
    } catch (error) {
        console.error('收回訊息錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

`;

// 在 exports.chatRoutes 之前插入
content = content.replace(
    'exports.chatRoutes = router;',
    recallRoute + 'exports.chatRoutes = router;'
);

// 寫回文件
fs.writeFileSync(path, content);
console.log('Recall API added successfully');
