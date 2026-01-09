const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;
const userSockets = new Map(); // userId -> socketId mapping

function initializeWebSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        path: '/socket.io/'
    });

    io.on('connection', (socket) => {
        console.log('WebSocket 客戶端連接:', socket.id);

        // 處理用戶認證
        socket.on('authenticate', (token) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
                socket.userId = decoded.id;
                userSockets.set(decoded.id, socket.id);
                console.log(`用戶 ${decoded.id} 已認證，Socket ID: ${socket.id}`);
                socket.emit('authenticated', { success: true });
            } catch (error) {
                console.error('WebSocket 認證失敗:', error);
                socket.emit('authenticated', { success: false, error: '認證失敗' });
            }
        });

        // 處理加入頻道
        socket.on('join_channel', (channelId) => {
            socket.join(`channel_${channelId}`);
            console.log(`Socket ${socket.id} 加入頻道: ${channelId}`);
        });

        // 處理離開頻道
        socket.on('leave_channel', (channelId) => {
            socket.leave(`channel_${channelId}`);
            console.log(`Socket ${socket.id} 離開頻道: ${channelId}`);
        });

        // 處理斷開連接
        socket.on('disconnect', () => {
            if (socket.userId) {
                userSockets.delete(socket.userId);
                console.log(`用戶 ${socket.userId} 斷開連接`);
            }
            console.log('WebSocket 客戶端斷開:', socket.id);
        });
    });

    console.log('WebSocket 伺服器已初始化');
    return io;
}

// 廣播新訊息到頻道
function broadcastMessage(channelId, message) {
    if (!io) {
        console.error('WebSocket 伺服器未初始化');
        return;
    }
    
    console.log(`廣播訊息到頻道 ${channelId}:`, message.id);
    io.to(`channel_${channelId}`).emit('chat_message', message);
}

// 廣播已讀狀態更新
function broadcastReadStatus(channelId, data) {
    if (!io) {
        console.error('WebSocket 伺服器未初始化');
        return;
    }
    
    console.log(`廣播已讀狀態到頻道 ${channelId}`);
    io.to(`channel_${channelId}`).emit('message_read', data);
}

// 廣播訊息收回
function broadcastMessageRecall(channelId, messageId) {
    if (!io) {
        console.error('WebSocket 伺服器未初始化');
        return;
    }
    
    console.log(`廣播訊息收回到頻道 ${channelId}:`, messageId);
    io.to(`channel_${channelId}`).emit('message_recalled', { messageId });
}

// 廣播頻道更新（編輯群組名稱、成員變更等）
function broadcastChannelUpdate(channelId, updateData) {
    if (!io) {
        console.error('WebSocket 伺服器未初始化');
        return;
    }
    
    console.log(`廣播頻道更新到頻道 ${channelId}`);
    io.to(`channel_${channelId}`).emit('channel_updated', updateData);
}

// 獲取 Socket.IO 實例
function getIO() {
    return io;
}

module.exports = {
    initializeWebSocket,
    broadcastMessage,
    broadcastReadStatus,
    broadcastMessageRecall,
    broadcastChannelUpdate,
    getIO
};
