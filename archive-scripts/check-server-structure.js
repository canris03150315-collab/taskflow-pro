const fs = require('fs');

console.log('=== Checking Server Structure ===\n');

const filePath = '/app/dist/index.js';
const content = fs.readFileSync(filePath, 'utf8');

// Find server setup patterns
const patterns = [
  { name: 'app.listen', regex: /app\.listen\([^)]+\)/g },
  { name: 'server.listen', regex: /server\.listen\([^)]+\)/g },
  { name: 'httpsServer.listen', regex: /httpsServer\.listen\([^)]+\)/g },
  { name: 'createServer', regex: /createServer\([^)]+\)/g },
  { name: 'PORT variable', regex: /PORT\s*=\s*[^;]+/g },
  { name: 'listen on 3000', regex: /listen.*3000/gi },
  { name: 'listen on 3001', regex: /listen.*3001/gi }
];

patterns.forEach(p => {
  const matches = content.match(p.regex);
  if (matches) {
    console.log(`\n${p.name}:`);
    matches.forEach(m => console.log('  -', m.substring(0, 100)));
  }
});

// Find the main server class or function
if (content.includes('class Server')) {
  console.log('\n✓ Found Server class');
  const classMatch = content.match(/class Server[^{]*\{/);
  if (classMatch) {
    console.log('  Position:', classMatch.index);
  }
}

// Check for Express app setup
if (content.includes('express()')) {
  console.log('\n✓ Found Express app');
}

// Look for the start method or main initialization
const startMatch = content.match(/start\(\)[^{]*\{/);
if (startMatch) {
  console.log('\n✓ Found start() method at position:', startMatch.index);
}

console.log('\n=== File size:', content.length, 'bytes ===');
