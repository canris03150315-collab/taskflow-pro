// WebSocket Server for Real-time Updates (Pure ASCII with Unicode Escape)
const WebSocket = require('ws');

class ChatWebSocketServer {
    constructor(httpServer) {
        this.wss = new WebSocket.Server({
            server: httpServer,
            path: '/ws'
        });
        this.clients = new Map(); // userId -> WebSocket connection
        
        console.log('\u{1F680} WebSocket \u4F3A\u670D\u5668\u5DF2\u555F\u52D5');
        
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
    }

    handleConnection(ws, req) {
        console.log('\u{1F4E1} \u65B0\u7684 WebSocket \u9023\u63A5');
        
        let userId = null;

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());

                if (message.type === 'AUTH') {
                    userId = message.userId;
                    this.clients.set(userId, ws);
                    console.log(`\u2705 \u7528\u6236 ${userId} \u5DF2\u9023\u63A5`);
                    
                    ws.send(JSON.stringify({
                        type: 'AUTH_SUCCESS',
                        message: '\u9023\u63A5\u6210\u529F'
                    }));
                } else if (message.type === 'PING') {
                    ws.send(JSON.stringify({ type: 'PONG' }));
                }
            } catch (error) {
                console.error('WebSocket \u8A0A\u606F\u8655\u7406\u932F\u8AA4:', error);
            }
        });

        ws.on('close', () => {
            if (userId) {
                this.clients.delete(userId);
                console.log(`\u{1F6AB} \u7528\u6236 ${userId} \u5DF2\u65B7\u958B\u9023\u63A5`);
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket \u932F\u8AA4:', error);
        });
    }

    // Broadcast new message to channel participants
    broadcastMessage(channelId, message, participantIds) {
        const payload = JSON.stringify({
            type: 'chat_message',
            payload: {
                channelId: channelId,
                message: message
            }
        });

        let sentCount = 0;
        participantIds.forEach(userId => {
            const client = this.clients.get(userId);
            if (client && client.readyState === WebSocket.OPEN) {
                client.send(payload);
                sentCount++;
            }
        });

        console.log(`\u{1F4E8} \u5EE3\u64AD\u8A0A\u606F\u5230 ${sentCount}/${participantIds.length} \u7528\u6236`);
    }

    // Notify user about new channel
    notifyNewChannel(userId, channel) {
        const client = this.clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'new_channel',
                payload: channel
            }));
        }
    }

    // NEW: Broadcast to all connected users
    broadcastToAll(type, payload) {
        const message = JSON.stringify({ 
            type: type, 
            payload: payload 
        });
        
        let sentCount = 0;
        this.clients.forEach((client, userId) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                    sentCount++;
                } catch (error) {
                    console.error(`\u767C\u9001\u5931\u6557 ${userId}:`, error);
                }
            }
        });
        
        console.log(`\u{1F4E1} \u5EE3\u64AD ${type} \u5230 ${sentCount}/${this.clients.size} \u7528\u6236`);
    }

    // NEW: Broadcast to specific users
    broadcastToUsers(userIds, type, payload) {
        const message = JSON.stringify({ 
            type: type, 
            payload: payload 
        });
        
        let sentCount = 0;
        userIds.forEach(userId => {
            const client = this.clients.get(userId);
            if (client && client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                    sentCount++;
                } catch (error) {
                    console.error(`\u767C\u9001\u5931\u6557 ${userId}:`, error);
                }
            }
        });
        
        console.log(`\u{1F4E1} \u5EE3\u64AD ${type} \u5230 ${sentCount}/${userIds.length} \u7528\u6236`);
    }

    // Get connected users count
    getConnectedCount() {
        return this.clients.size;
    }
}

module.exports = ChatWebSocketServer;
