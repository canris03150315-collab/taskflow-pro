const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Check if already registered
if (content.includes("app.use('/api/backup'")) {
  console.log('Backup route already registered');
  process.exit(0);
}

// Find the last app.use route and add after it
const lines = content.split('\n');
let lastRouteIndex = -1;

for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes("app.use('/api/") && lines[i].includes("require('./routes/")) {
    lastRouteIndex = i;
    break;
  }
}

if (lastRouteIndex === -1) {
  console.log('ERROR: Could not find route registration pattern');
  process.exit(1);
}

// Insert the backup route after the last route
lines.splice(lastRouteIndex + 1, 0, "app.use('/api/backup', require('./routes/backup'));");

fs.writeFileSync(serverPath, lines.join('\n'), 'utf8');
console.log('SUCCESS: Registered backup route in server.js');
