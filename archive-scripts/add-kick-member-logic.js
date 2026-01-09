// Add kick member logic to chat.js (Pure ASCII with Unicode Escape)
const fs = require('fs');

console.log('Adding kick member logic to chat.js...');

const chatPath = '/app/dist/routes/chat.js';
let content = fs.readFileSync(chatPath, 'utf8');

// Check if already added
if (content.includes('removedMembers')) {
    console.log('Kick member logic already exists');
    process.exit(0);
}

// Find the PUT /channels/:channelId route where participants are updated
const marker = "'UPDATE chat_channels SET name = ?, participants = ? WHERE id = ?',";
const pos = content.indexOf(marker);

if (pos === -1) {
    console.error('ERROR: Could not find update participants position');
    process.exit(1);
}

// Find the end of this statement (semicolon)
let endPos = pos + marker.length;

// Insert kick member logic after the update
const kickLogic = `

        // Notify removed members via WebSocket
        try {
            const removedMembers = currentParticipants.filter(id => !newParticipants.includes(id));
            if (removedMembers.length > 0) {
                const wsServer = req.app.get('wsServer');
                if (wsServer) {
                    removedMembers.forEach(userId => {
                        const client = wsServer.clients.get(userId);
                        if (client && client.readyState === 1) { // WebSocket.OPEN = 1
                            client.send(JSON.stringify({
                                type: 'kicked_from_channel',
                                payload: {
                                    channelId: channelId,
                                    message: '\u4F60\u5DF2\u88AB\u79FB\u51FA\u7FA4\u7D44'
                                }
                            }));
                        }
                    });
                    console.log(\`\u{1F6AB} \u79FB\u9664 \${removedMembers.length} \u500B\u6210\u54E1\u5F9E\u7FA4\u7D44 \${channelId}\`);
                }
            }
        } catch (kickError) {
            console.error('Kick member notification error:', kickError);
        }
`;

content = content.slice(0, endPos) + kickLogic + content.slice(endPos);

fs.writeFileSync(chatPath, content, 'utf8');

console.log('SUCCESS: Kick member logic added');
console.log('Removed members will now be notified via WebSocket');
