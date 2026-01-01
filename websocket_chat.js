"use strict";
/**
 * WebSocket 聊天服務
 * 提供即時通訊功能，取代輪詢機制
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = exports.broadcastToChannel = exports.sendToUser = void 0;

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 連線管理
const connections = new Map(); // userId -> WebSocket[]
const channelSubscriptions = new Map(); // channelId -> Set<userId>

/**
 * 發送訊息給特定用戶
 */
const sendToUser = (userId, message) => {
    const userConnections = connections.get(userId);
    if (userConnections) {
        const data = JSON.stringify(message);
        userConnections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });
    }
};
exports.sendToUser = sendToUser;

/**
 * 廣播訊息到頻道
 */
const broadcastToChannel = (channelId, message, excludeUserId) => {
    const subscribers = channelSubscriptions.get(channelId);
    if (subscribers) {
        subscribers.forEach(userId => {
            if (userId !== excludeUserId) {
                sendToUser(userId, message);
            }
        });
    }
};
exports.broadcastToChannel = broadcastToChannel;

/**
 * 設置 WebSocket 服務
 */
const setupWebSocket = (server, db) => {
    const wss = new WebSocket.Server({ 
        server,
        path: '/ws/chat'
    });

    console.log('[WebSocket] 聊天 WebSocket 服務已啟動');

    wss.on('connection', (ws, req) => {
        let userId = null;
        let userName = null;

        // 心跳檢測
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                switch (message.type) {
                    case 'AUTH':
                        // 驗證 Token
                        try {
                            const decoded = jwt.verify(message.token, JWT_SECRET);
                            userId = decoded.id;
                            userName = decoded.name || decoded.username;
                            
                            // 註冊連線
                            if (!connections.has(userId)) {
                                connections.set(userId, new Set());
                            }
                            connections.get(userId).add(ws);
                            
                            ws.send(JSON.stringify({
                                type: 'AUTH_SUCCESS',
                                userId,
                                message: '認證成功'
                            }));
                            
                            console.log(`[WebSocket] 用戶 ${userName} (${userId}) 已連線`);
                        } catch (err) {
                            ws.send(JSON.stringify({
                                type: 'AUTH_FAILED',
                                error: '認證失敗'
                            }));
                            ws.close();
                        }
                        break;

                    case 'SUBSCRIBE':
                        // 訂閱頻道
                        if (!userId) {
                            ws.send(JSON.stringify({ type: 'ERROR', error: '未認證' }));
                            return;
                        }
                        
                        const channelId = message.channelId;
                        if (!channelSubscriptions.has(channelId)) {
                            channelSubscriptions.set(channelId, new Set());
                        }
                        channelSubscriptions.get(channelId).add(userId);
                        
                        ws.send(JSON.stringify({
                            type: 'SUBSCRIBED',
                            channelId
                        }));
                        break;

                    case 'UNSUBSCRIBE':
                        // 取消訂閱
                        if (userId && message.channelId) {
                            const subs = channelSubscriptions.get(message.channelId);
                            if (subs) {
                                subs.delete(userId);
                            }
                        }
                        break;

                    case 'SEND_MESSAGE':
                        // 發送訊息
                        if (!userId) {
                            ws.send(JSON.stringify({ type: 'ERROR', error: '未認證' }));
                            return;
                        }

                        const { channelId: msgChannelId, content } = message;
                        const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                        const timestamp = new Date().toISOString();

                        // 儲存訊息到資料庫
                        try {
                            await db.run(
                                `INSERT INTO messages (id, channel_id, user_id, user_name, content, created_at, read_by)
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [msgId, msgChannelId, userId, userName, content, timestamp, JSON.stringify([userId])]
                            );

                            // 更新頻道最後訊息時間
                            await db.run(
                                `UPDATE channels SET updated_at = ? WHERE id = ?`,
                                [timestamp, msgChannelId]
                            );

                            const newMessage = {
                                id: msgId,
                                channelId: msgChannelId,
                                userId,
                                userName,
                                content,
                                timestamp,
                                readBy: [userId]
                            };

                            // 廣播到頻道所有訂閱者
                            broadcastToChannel(msgChannelId, {
                                type: 'NEW_MESSAGE',
                                message: newMessage
                            });

                        } catch (err) {
                            console.error('[WebSocket] 儲存訊息失敗:', err);
                            ws.send(JSON.stringify({
                                type: 'ERROR',
                                error: '訊息發送失敗'
                            }));
                        }
                        break;

                    case 'TYPING':
                        // 正在輸入通知
                        if (userId && message.channelId) {
                            broadcastToChannel(message.channelId, {
                                type: 'USER_TYPING',
                                channelId: message.channelId,
                                userId,
                                userName
                            }, userId);
                        }
                        break;

                    case 'MARK_READ':
                        // 標記已讀
                        if (userId && message.channelId) {
                            try {
                                // 更新所有未讀訊息
                                const unreadMessages = await db.all(
                                    `SELECT id, read_by FROM messages 
                                     WHERE channel_id = ? AND read_by NOT LIKE ?`,
                                    [message.channelId, `%${userId}%`]
                                );

                                for (const msg of unreadMessages) {
                                    let readBy = [];
                                    try {
                                        readBy = JSON.parse(msg.read_by || '[]');
                                    } catch(e) {}
                                    
                                    if (!readBy.includes(userId)) {
                                        readBy.push(userId);
                                        await db.run(
                                            `UPDATE messages SET read_by = ? WHERE id = ?`,
                                            [JSON.stringify(readBy), msg.id]
                                        );
                                    }
                                }

                                // 通知其他用戶
                                broadcastToChannel(message.channelId, {
                                    type: 'MESSAGES_READ',
                                    channelId: message.channelId,
                                    userId
                                }, userId);

                            } catch (err) {
                                console.error('[WebSocket] 標記已讀失敗:', err);
                            }
                        }
                        break;

                    case 'PING':
                        ws.send(JSON.stringify({ type: 'PONG' }));
                        break;
                }

            } catch (err) {
                console.error('[WebSocket] 訊息處理錯誤:', err);
            }
        });

        ws.on('close', () => {
            if (userId) {
                // 移除連線
                const userConns = connections.get(userId);
                if (userConns) {
                    userConns.delete(ws);
                    if (userConns.size === 0) {
                        connections.delete(userId);
                        
                        // 清除所有頻道訂閱
                        channelSubscriptions.forEach((subscribers, channelId) => {
                            subscribers.delete(userId);
                        });
                    }
                }
                console.log(`[WebSocket] 用戶 ${userName} (${userId}) 已斷線`);
            }
        });

        ws.on('error', (err) => {
            console.error('[WebSocket] 連線錯誤:', err);
        });
    });

    // 心跳檢測 (每 30 秒)
    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach(ws => {
            if (ws.isAlive === false) {
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(heartbeatInterval);
    });

    return wss;
};
exports.setupWebSocket = setupWebSocket;
