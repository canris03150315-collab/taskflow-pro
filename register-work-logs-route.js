// register-work-logs-route.js
// Register work-logs route in server.js

const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Check if already registered
if (content.includes('work-logs')) {
  console.log('ALREADY REGISTERED: work-logs route already exists');
  process.exit(0);
}

// Find the routes section and add work-logs
const routeImport = "const workLogs_1 = require(\"./routes/work-logs\");";
const routeUse = "this.app.use('/api/work-logs', workLogs_1.workLogRoutes);";

// Add import after other route imports
const importPattern = /const \w+_1 = require\("\.\/routes\/\w+"\);/g;
const imports = content.match(importPattern);
if (imports && imports.length > 0) {
  const lastImport = imports[imports.length - 1];
  content = content.replace(lastImport, lastImport + '\n' + routeImport);
  console.log('SUCCESS: Added work-logs import');
}

// Add route registration after other route registrations
const usePattern = /this\.app\.use\('\/api\/\w+',\s*\w+_1\.\w+\);/g;
const uses = content.match(usePattern);
if (uses && uses.length > 0) {
  const lastUse = uses[uses.length - 1];
  content = content.replace(lastUse, lastUse + '\n        ' + routeUse);
  console.log('SUCCESS: Added work-logs route registration');
}

fs.writeFileSync(serverPath, content, 'utf8');
console.log('SUCCESS: server.js updated');
