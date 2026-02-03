const fs = require('fs');

console.log('Fixing work-logs require statement...');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Remove any existing incorrect work-logs references
content = content.replace(/const workLogsRoutes = require\('\.\/routes\/work-logs'\);?\n?/g, '');
content = content.replace(/this\.app\.use\('\/api\/work-logs',\s*workLogsRoutes\);?\n?/g, '');

// Find where to add the require - look for other route requires
const lines = content.split('\n');
let requireLineIndex = -1;
let routeLineIndex = -1;

for (let i = 0; i < lines.length; i++) {
  // Find the last route require statement
  if (lines[i].match(/const \w+ = require\('\.\/routes\/\w+'\);/) || 
      lines[i].match(/const { \w+ } = require\('\.\/routes\/\w+'\);/)) {
    requireLineIndex = i;
  }
  // Find reports route registration
  if (lines[i].includes("this.app.use('/api/reports'")) {
    routeLineIndex = i;
  }
}

if (requireLineIndex === -1 || routeLineIndex === -1) {
  console.log('ERROR: Could not find insertion points');
  console.log('requireLineIndex:', requireLineIndex);
  console.log('routeLineIndex:', routeLineIndex);
  process.exit(1);
}

// Insert require statement
lines.splice(requireLineIndex + 1, 0, "const workLogsRoutes = require('./routes/work-logs');");

// Insert route registration (add 1 because we inserted a line above)
lines.splice(routeLineIndex + 2, 0, "        this.app.use('/api/work-logs', workLogsRoutes);");

// Write back
content = lines.join('\n');
fs.writeFileSync(serverPath, content, 'utf8');

console.log('SUCCESS: Fixed work-logs require and route registration');
console.log('DONE');
