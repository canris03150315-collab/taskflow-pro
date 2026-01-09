// Add WebSocket server to existing server.js
const fs = require('fs');

console.log('Adding WebSocket to server.js...');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Check if already integrated
if (content.includes('ChatWebSocketServer')) {
    console.log('WebSocket already integrated');
    process.exit(0);
}

// Find the listen callback
const listenMarker = "this.server.listen(this.config.port, '0.0.0.0', () => {";
const listenPos = content.indexOf(listenMarker);

if (listenPos === -1) {
    console.error('ERROR: Could not find listen position');
    process.exit(1);
}

// Find the end of the listen callback
let pos = listenPos + listenMarker.length;
let braceCount = 1;

while (pos < content.length && braceCount > 0) {
    if (content[pos] === '{') braceCount++;
    else if (content[pos] === '}') braceCount--;
    pos++;
}

// Insert WebSocket initialization before the closing brace
const wsCode = `
                // Initialize WebSocket server
                try {
                    const ChatWebSocketServer = require('./websocket-server');
                    this.wsServer = new ChatWebSocketServer(this.server);
                    this.app.set('wsServer', this.wsServer);
                    console.log('\u2705 WebSocket \u4F3A\u670D\u5668\u5DF2\u555F\u52D5\u65BC /ws');
                } catch (wsError) {
                    console.error('\u26A0\uFE0F WebSocket \u555F\u52D5\u5931\u6557:', wsError.message);
                }
`;

content = content.slice(0, pos - 1) + wsCode + content.slice(pos - 1);

fs.writeFileSync(serverPath, content, 'utf8');

console.log('SUCCESS: WebSocket added to server.js');
