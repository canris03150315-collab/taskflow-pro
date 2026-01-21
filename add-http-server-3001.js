const fs = require('fs');

console.log('=== Adding HTTP Server (Port 3001) ===\n');

const filePath = '/app/dist/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// Check if HTTP server already exists
if (content.includes('httpServer.listen(3001')) {
  console.log('HTTP server already configured');
  process.exit(0);
}

// Find the position after HTTPS server setup
const httpsServerMatch = content.match(/httpsServer\.listen\(PORT[^}]+\}/s);
if (!httpsServerMatch) {
  console.log('ERROR: Cannot find HTTPS server setup');
  process.exit(1);
}

const insertPosition = httpsServerMatch.index + httpsServerMatch[0].length;

// HTTP server code (Pure ASCII with Unicode escapes)
const httpServerCode = `

    // HTTP \u4f3a\u670d\u5668 (\u7aef\u53e3 3001) - \u7d66 Netlify \u53cd\u5411\u4ee3\u7406\u4f7f\u7528
    const http = require('http');
    const httpServer = http.createServer(this.app);
    httpServer.listen(3001, '0.0.0.0', () => {
      console.log('\\u2705 HTTP \\u4f3a\\u670d\\u5668\\u5df2\\u555f\\u52d5\\u65bc\\u7aef\\u53e3 3001');
    });`;

// Insert HTTP server code
content = content.slice(0, insertPosition) + httpServerCode + content.slice(insertPosition);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('SUCCESS: HTTP server added');
console.log('- Port 3000: HTTPS (direct access)');
console.log('- Port 3001: HTTP (Netlify proxy)');
