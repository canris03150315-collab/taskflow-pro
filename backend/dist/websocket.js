// Bridge module - chat.js imports from here
// The actual wsServer instance is set by server.js via setWsServer()

let wsServerInstance = null;

function setWsServer(server) {
    wsServerInstance = server;
}

function broadcastMessage(channelId, message, participantIds) {
    if (wsServerInstance && typeof wsServerInstance.broadcastMessage === 'function') {
        wsServerInstance.broadcastMessage(channelId, message, participantIds || []);
    }
}

function broadcastReadStatus(channelId, userId, messageId) {
    if (wsServerInstance && typeof wsServerInstance.broadcastToAll === 'function') {
        wsServerInstance.broadcastToAll('chat_read', { channelId, userId, messageId });
    }
}

function broadcastMessageRecall(channelId, messageId) {
    if (wsServerInstance && typeof wsServerInstance.broadcastToAll === 'function') {
        wsServerInstance.broadcastToAll('chat_recall', { channelId, messageId });
    }
}

function broadcastChannelUpdate(channel) {
    if (wsServerInstance && typeof wsServerInstance.broadcastToAll === 'function') {
        wsServerInstance.broadcastToAll('channel_update', { channel });
    }
}

module.exports = {
    setWsServer,
    broadcastMessage,
    broadcastReadStatus,
    broadcastMessageRecall,
    broadcastChannelUpdate
};
