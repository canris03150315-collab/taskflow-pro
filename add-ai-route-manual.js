const fs = require('fs');

console.log('Manually adding AI assistant route to index.js...');

const indexPath = '/app/dist/index.js';
let content = fs.readFileSync(indexPath, 'utf8');

// Check if already added
if (content.includes('ai-assistant')) {
  console.log('AI assistant route already exists');
  process.exit(0);
}

// Find where to insert - look for the last occurrence of routes setup
// Try to find app.listen or server.listen
const listenPattern = /(?:app|server)\.listen\(/;
const listenMatch = content.search(listenPattern);

if (listenMatch === -1) {
  console.error('ERROR: Could not find app.listen or server.listen');
  process.exit(1);
}

// Insert before listen
const aiRouteCode = `
// AI Assistant routes
app.use('/api/ai-assistant', require('./routes/ai-assistant'));

`;

content = content.slice(0, listenMatch) + aiRouteCode + content.slice(listenMatch);

// Write back
fs.writeFileSync(indexPath, content, 'utf8');

console.log('SUCCESS: AI assistant route added manually');
console.log('Route registered: /api/ai-assistant');
