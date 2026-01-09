// Fix kick member logic - insert at correct position (Pure ASCII)
const fs = require('fs');

console.log('Adding kick member notification logic...');

const chatPath = '/app/dist/routes/chat.js';
let content = fs.readFileSync(chatPath, 'utf8');

// Check if already added
if (content.includes('kicked_from_channel')) {
    console.log('Kick logic already exists');
    process.exit(0);
}

// Find the position after db.run UPDATE and before db.get SELECT
const updateMarker = "await db.run(\n            'UPDATE chat_channels SET name = ?, participants = ? WHERE id = ?',\n            [newName, JSON.stringify(newParticipants), channelId]\n        );";
const pos = content.indexOf(updateMarker);

if (pos === -1) {
    console.error('ERROR: Could not find update position');
    process.exit(1);
}

// Find the semicolon after the closing parenthesis
let searchPos = pos + updateMarker.length;
while (searchPos < content.length && content[searchPos] !== ';') {
    searchPos++;
}
searchPos++; // Include the semicolon

// Insert kick notification logic
const kickLogic = `

        // Notify removed members via WebSocket
        try {
            const removedMembers = currentParticipants.filter(id => !newParticipants.includes(id));
            if (removedMembers.length > 0) {
                const wsServer = req.app.get('wsServer');
                if (wsServer) {
                    removedMembers.forEach(userId => {
                        const client = wsServer.clients.get(userId);
                        if (client && client.readyState === 1) {
                            client.send(JSON.stringify({
                                type: 'kicked_from_channel',
                                payload: {
                                    channelId: channelId,
                                    message: '\u4F60\u5DF2\u88AB\u79FB\u51FA\u7FA4\u7D44'
                                }
                            }));
                        }
                    });
                    console.log(\`\u{1F6AB} \u79FB\u9664 \${removedMembers.length} \u6210\u54E1\u5F9E\u7FA4\u7D44 \${channelId}\`);
                }
            }
        } catch (kickError) {
            console.error('Kick notification error:', kickError);
        }
`;

content = content.slice(0, searchPos) + kickLogic + content.slice(searchPos);

fs.writeFileSync(chatPath, content, 'utf8');

console.log('SUCCESS: Kick member notification added');
console.log('Position:', searchPos);
