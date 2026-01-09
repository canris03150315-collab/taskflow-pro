const fs = require('fs');

const filePath = '/app/dist/index.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Registering backup routes...');

// Check if already registered
if (content.includes("app.use('/api/backup'")) {
  console.log('Backup routes already registered');
  process.exit(0);
}

// Find where other routes are registered (look for app.use patterns)
const routePattern = /app\.use\('\/api\/\w+',.*?\);/g;
const matches = content.match(routePattern);

if (!matches || matches.length === 0) {
  console.log('ERROR: Could not find route registration pattern');
  process.exit(1);
}

// Find the last route registration
const lastRouteIndex = content.lastIndexOf(matches[matches.length - 1]);
const insertPos = content.indexOf(';', lastRouteIndex) + 1;

// Add backup route registration
const backupRoute = `\napp.use('/api/backup', require('./routes/backup'));`;

content = content.substring(0, insertPos) + backupRoute + content.substring(insertPos);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Registered backup routes');
