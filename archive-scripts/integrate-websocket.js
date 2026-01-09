// Script to integrate WebSocket server into existing backend
const fs = require('fs');

console.log('Integrating WebSocket server...');

// 1. Check if ws package is installed
console.log('1. Checking ws package...');
const packageJsonPath = '/app/package.json';
let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.dependencies.ws) {
    console.log('Adding ws to dependencies...');
    packageJson.dependencies.ws = '^8.14.0';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('ws package added to package.json');
}

// 2. Modify index.js to integrate WebSocket
console.log('2. Modifying index.js...');
const indexPath = '/app/dist/index.js';
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Check if WebSocket is already integrated
if (indexContent.includes('ChatWebSocketServer')) {
    console.log('WebSocket already integrated, skipping...');
} else {
    // Find the position after server starts
    const serverStartMarker = 'this.server.listen';
    const insertPosition = indexContent.indexOf(serverStartMarker);
    
    if (insertPosition === -1) {
        console.error('ERROR: Could not find server start position');
        process.exit(1);
    }
    
    // Find the end of the listen callback
    let braceCount = 0;
    let pos = insertPosition;
    let foundStart = false;
    
    while (pos < indexContent.length) {
        if (indexContent[pos] === '{') {
            braceCount++;
            foundStart = true;
        } else if (indexContent[pos] === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
                pos++;
                break;
            }
        }
        pos++;
    }
    
    // Insert WebSocket initialization
    const wsIntegration = `
        
        // Initialize WebSocket server
        try {
            const ChatWebSocketServer = require('./websocket-server');
            this.wsServer = new ChatWebSocketServer(this.server);
            console.log('\u2705 WebSocket \u4F3A\u670D\u5668\u5DF2\u555F\u52D5\u65BC /ws');
        } catch (error) {
            console.error('\u26A0\uFE0F WebSocket \u4F3A\u670D\u5668\u555F\u52D5\u5931\u6557:', error);
        }
`;
    
    indexContent = indexContent.slice(0, pos) + wsIntegration + indexContent.slice(pos);
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log('WebSocket integration added to index.js');
}

// 3. Modify chat.js to broadcast messages via WebSocket
console.log('3. Modifying chat.js...');
const chatPath = '/app/dist/routes/chat.js';
let chatContent = fs.readFileSync(chatPath, 'utf8');

// Add WebSocket broadcast after message creation
if (!chatContent.includes('wsServer.broadcastMessage')) {
    // Find POST /channels/:channelId/messages route
    const messagePostMarker = "router.post('/:channelId/messages'";
    const messagePostPos = chatContent.indexOf(messagePostMarker);
    
    if (messagePostPos !== -1) {
        // Find where we insert message to database
        const insertMarker = 'await db.run';
        let searchPos = messagePostPos;
        let insertPos = -1;
        
        // Find the INSERT statement for messages
        while (searchPos < chatContent.length) {
            const foundPos = chatContent.indexOf(insertMarker, searchPos);
            if (foundPos === -1) break;
            
            // Check if this is the messages INSERT
            const snippet = chatContent.substring(foundPos, foundPos + 200);
            if (snippet.includes('INSERT INTO chat_messages')) {
                insertPos = foundPos;
                break;
            }
            searchPos = foundPos + 1;
        }
        
        if (insertPos !== -1) {
            // Find the end of the await db.run statement
            let pos = insertPos;
            let parenCount = 0;
            let foundParen = false;
            
            while (pos < chatContent.length) {
                if (chatContent[pos] === '(') {
                    parenCount++;
                    foundParen = true;
                } else if (chatContent[pos] === ')') {
                    parenCount--;
                    if (foundParen && parenCount === 0) {
                        pos++;
                        // Skip to end of line
                        while (pos < chatContent.length && chatContent[pos] !== ';') {
                            pos++;
                        }
                        pos++; // Skip the semicolon
                        break;
                    }
                }
                pos++;
            }
            
            const wsBroadcast = `
        
        // Broadcast via WebSocket
        try {
            const wsServer = req.app.get('wsServer');
            if (wsServer) {
                const participantIds = participants.map(p => p.user_id);
                wsServer.broadcastMessage(channelId, newMessage, participantIds);
            }
        } catch (wsError) {
            console.error('WebSocket broadcast error:', wsError);
        }
`;
            
            chatContent = chatContent.slice(0, pos) + wsBroadcast + chatContent.slice(pos);
            fs.writeFileSync(chatPath, chatContent, 'utf8');
            console.log('WebSocket broadcast added to chat.js');
        }
    }
}

console.log('');
console.log('SUCCESS: WebSocket integration complete');
console.log('Next steps:');
console.log('1. Install ws package: cd /app && npm install');
console.log('2. Restart container: docker restart taskflow-pro');
