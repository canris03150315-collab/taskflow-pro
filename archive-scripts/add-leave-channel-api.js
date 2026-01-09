"use strict";
const fs = require('fs');

// 讀取文件
const filePath = '/app/dist/routes/chat.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 recallMessage 路由之後添加 leaveChannel 路由
const leaveChannelRoute = `
// POST /api/chat/channels/:channelId/leave - 離開群組
router.post('/:channelId/leave', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;

        // 檢查頻道是否存在
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        // 不能離開私聊頻道
        if (channel.type === 'DIRECT') {
            return res.status(400).json({ error: '無法離開私聊頻道' });
        }

        // 解析參與者列表
        let participants = [];
        try {
            participants = typeof channel.participants === 'string' 
                ? JSON.parse(channel.participants) 
                : (channel.participants || []);
        } catch (e) {
            participants = [];
        }

        // 檢查用戶是否在群組中
        if (!participants.includes(currentUser.id)) {
            return res.status(400).json({ error: '您不在此群組中' });
        }

        // 從參與者列表中移除用戶
        const newParticipants = participants.filter(id => id !== currentUser.id);

        // 如果群組沒有成員了，刪除群組
        if (newParticipants.length === 0) {
            await db.run('DELETE FROM chat_channels WHERE id = ?', [channelId]);
            await db.run('DELETE FROM chat_messages WHERE channel_id = ?', [channelId]);
        } else {
            // 更新參與者列表
            await db.run(
                'UPDATE chat_channels SET participants = ? WHERE id = ?',
                [JSON.stringify(newParticipants), channelId]
            );
        }

        // 記錄系統消息
        await (0, logger_1.logSystemAction)(db, currentUser, 'LEAVE_CHANNEL', \`離開群組: \${channel.name}\`);

        res.json({ 
            success: true,
            message: '已成功離開群組' 
        });
    } catch (error) {
        console.error('離開群組錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
`;

// 在最後一個 router 定義之前插入
const insertPosition = content.lastIndexOf('exports.chatRoutes = router;');
if (insertPosition === -1) {
    console.error('❌ 找不到 exports.chatRoutes');
    process.exit(1);
}

content = content.slice(0, insertPosition) + leaveChannelRoute + '\n' + content.slice(insertPosition);

// 寫回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ 已添加離開群組 API');
