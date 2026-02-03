const fs = require('fs');

console.log('Registering AI assistant route...');

const indexPath = '/app/dist/index.js';
let content = fs.readFileSync(indexPath, 'utf8');

// Check if already registered
if (content.includes("app.use('/api/ai-assistant'")) {
  console.log('AI assistant route already registered');
  process.exit(0);
}

// Find the routes registration section
const routePattern = /app\.use\('\/api\/[^']+',\s*require\('[^']+'\)\);/g;
const matches = content.match(routePattern);

if (!matches || matches.length === 0) {
  console.error('ERROR: Could not find route registration pattern');
  process.exit(1);
}

// Get the last route registration
const lastRoute = matches[matches.length - 1];
const insertPosition = content.indexOf(lastRoute) + lastRoute.length;

// Insert AI assistant route
const aiAssistantRoute = "\napp.use('/api/ai-assistant', require('./routes/ai-assistant'));";

content = content.slice(0, insertPosition) + aiAssistantRoute + content.slice(insertPosition);

// Write back
fs.writeFileSync(indexPath, content, 'utf8');

console.log('SUCCESS: AI assistant route registered');
console.log("Route: /api/ai-assistant");
