const fs = require('fs');

console.log('=== Adding HTTP Server (Simple Approach) ===\n');

const filePath = '/app/dist/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already has HTTP server
if (content.includes('3001') || content.includes('httpServer')) {
  console.log('HTTP server code already exists');
  process.exit(0);
}

// Find where to insert - look for the end of start() method or app setup
// Insert before the final closing brace or after app.listen
const patterns = [
  { regex: /app\.listen\(PORT[^}]+\}[^}]*\}/s, name: 'app.listen block' },
  { regex: /start\(\)[^{]*\{[\s\S]+?\n\s{2}\}/s, name: 'start() method' }
];

let insertPos = -1;
let matchedPattern = null;

for (const p of patterns) {
  const match = content.match(p.regex);
  if (match) {
    insertPos = match.index + match[0].length;
    matchedPattern = p.name;
    break;
  }
}

if (insertPos === -1) {
  // Fallback: insert before last closing brace
  const lastBrace = content.lastIndexOf('}');
  if (lastBrace > 0) {
    insertPos = lastBrace;
    matchedPattern = 'before last brace';
  } else {
    console.log('ERROR: Cannot find insertion point');
    process.exit(1);
  }
}

console.log('Insertion point found:', matchedPattern);
console.log('Position:', insertPos);

// HTTP server code with Unicode escapes for Chinese
const httpCode = `

    // HTTP \u4f3a\u670d\u5668 (Port 3001) - For Netlify Proxy
    const http = require('http');
    const httpApp = this.app || app;
    const httpServer = http.createServer(httpApp);
    httpServer.listen(3001, '0.0.0.0', () => {
      console.log('\\u2705 HTTP \\u4f3a\\u670d\\u5668\\u5df2\\u555f\\u52d5\\u65bc\\u7aef\\u53e3 3001');
    });
`;

// Insert the code
content = content.slice(0, insertPos) + httpCode + content.slice(insertPos);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('\nSUCCESS: HTTP server code added');
console.log('- HTTPS Port 3000: Direct access');
console.log('- HTTP Port 3001: Netlify proxy');
