"use strict";
const fs = require('fs');

// 讀取文件
const filePath = '/app/dist/routes/chat.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 leaveChannel 路由之後添加 editChannel 路由
const editChannelRoute = `
// PUT /api/chat/channels/:channelId - 編輯群組
router.put('/channels/:channelId', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { channelId } = req.params;
        const { name, participant_ids } = req.body;

        // 檢查頻道是否存在
        const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [channelId]);
        if (!channel) {
            return res.status(404).json({ error: '頻道不存在' });
        }

        // 不能編輯私聊頻道
        if (channel.type === 'DIRECT') {
            return res.status(400).json({ error: '無法編輯私聊頻道' });
        }

        // 解析參與者列表
        let currentParticipants = [];
        try {
            currentParticipants = typeof channel.participants === 'string' 
                ? JSON.parse(channel.participants) 
                : (channel.participants || []);
        } catch (e) {
            currentParticipants = [];
        }

        // 檢查用戶是否在群組中
        if (!currentParticipants.includes(currentUser.id)) {
            return res.status(403).json({ error: '您不在此群組中' });
        }

        // 更新群組名稱和參與者
        const newName = name || channel.name;
        const newParticipants = participant_ids || currentParticipants;

        // 確保當前用戶在參與者列表中
        if (!newParticipants.includes(currentUser.id)) {
            newParticipants.push(currentUser.id);
        }

        await db.run(
            'UPDATE chat_channels SET name = ?, participants = ? WHERE id = ?',
            [newName, JSON.stringify(newParticipants), channelId]
        );

        // 獲取更新後的頻道資訊
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
        console.error('編輯群組錯誤:', error);
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

content = content.slice(0, insertPosition) + editChannelRoute + '\n' + content.slice(insertPosition);

// 寫回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ 已添加編輯群組 API');
