// Simple WebSocket integration script
const fs = require('fs');

console.log('Integrating WebSocket into server.js...');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Check if already integrated
if (content.includes('websocket-server')) {
    console.log('WebSocket already integrated');
    process.exit(0);
}

// Find the position after server starts listening
// Look for the console.log that happens after listen
const marker = "console.log('\u{1F389} TaskFlow Pro \u4F3A\u670D\u5668\u5DF2\u555F\u52D5\uFF01')";
const pos = content.indexOf(marker);

if (pos === -1) {
    console.error('ERROR: Could not find integration point');
    process.exit(1);
}

// Find the end of that console.log statement
let endPos = pos;
while (endPos < content.length && content[endPos] !== ';') {
    endPos++;
}
endPos++; // Include the semicolon

// Insert WebSocket initialization after the console.log
const wsIntegration = `
                // Initialize WebSocket server
                try {
                    const ChatWebSocketServer = require('./websocket-server');
                    this.wsServer = new ChatWebSocketServer(this.server);
                    this.app.set('wsServer', this.wsServer);
                    console.log('\\u2705 WebSocket \\u4F3A\\u670D\\u5668\\u5DF2\\u555F\\u52D5\\u65BC /ws');
                } catch (wsError) {
                    console.error('\\u26A0\\uFE0F WebSocket \\u555F\\u52D5\\u5931\\u6557:', wsError.message);
                }`;

content = content.slice(0, endPos) + wsIntegration + content.slice(endPos);

fs.writeFileSync(serverPath, content, 'utf8');

console.log('SUCCESS: WebSocket integrated into server.js');
console.log('Restart container to activate WebSocket');
