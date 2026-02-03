const fs = require('fs');

console.log('Adding AI assistant route to server.js...');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Check if already added
if (content.includes('ai-assistant')) {
  console.log('AI assistant route already exists');
  process.exit(0);
}

// Find the last route registration by looking for common patterns
// Look for patterns like: this.app.use('/api/xxx', require('./routes/xxx'))
const routePattern = /this\.app\.use\('\/api\/[^']+',\s*require\('[^']+'\)\);?/g;
const matches = content.match(routePattern);

if (!matches || matches.length === 0) {
  console.error('ERROR: Could not find route registration pattern');
  console.log('Trying alternative approach...');
  
  // Try to find setupRoutes method or similar
  const setupRoutesIndex = content.indexOf('setupRoutes');
  if (setupRoutesIndex !== -1) {
    // Find the end of setupRoutes method
    let braceCount = 0;
    let startBrace = -1;
    for (let i = setupRoutesIndex; i < content.length; i++) {
      if (content[i] === '{') {
        if (startBrace === -1) startBrace = i;
        braceCount++;
      } else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startBrace !== -1) {
          // Insert before the closing brace
          const aiRouteCode = "\n        this.app.use('/api/ai-assistant', require('./routes/ai-assistant'));\n    ";
          content = content.slice(0, i) + aiRouteCode + content.slice(i);
          fs.writeFileSync(serverPath, content, 'utf8');
          console.log('SUCCESS: AI assistant route added to setupRoutes');
          process.exit(0);
        }
      }
    }
  }
  
  console.error('ERROR: Could not find suitable insertion point');
  process.exit(1);
}

// Get the last route registration
const lastRoute = matches[matches.length - 1];
const insertPosition = content.indexOf(lastRoute) + lastRoute.length;

// Insert AI assistant route
const aiAssistantRoute = "\n        this.app.use('/api/ai-assistant', require('./routes/ai-assistant'));";

content = content.slice(0, insertPosition) + aiAssistantRoute + content.slice(insertPosition);

// Write back
fs.writeFileSync(serverPath, content, 'utf8');

console.log('SUCCESS: AI assistant route registered in server.js');
console.log('Route: /api/ai-assistant');
