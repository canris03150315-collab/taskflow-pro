const fs = require('fs');

console.log('Fixing work-logs route registration...');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Check if already registered
if (content.includes("this.app.use('/api/work-logs'")) {
  console.log('INFO: work-logs route already registered');
  process.exit(0);
}

// Find the line with reports route
const lines = content.split('\n');
let insertIndex = -1;
let requireInsertIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("this.app.use('/api/reports'")) {
    insertIndex = i;
  }
  if (lines[i].includes("reports_1.reportRoutes") || lines[i].includes("reportRoutes")) {
    if (lines[i].includes('const') || lines[i].includes('require')) {
      requireInsertIndex = i;
    }
  }
}

if (insertIndex === -1) {
  console.log('ERROR: Could not find reports route');
  process.exit(1);
}

// Add require at the top if we found a require section
if (requireInsertIndex !== -1) {
  lines.splice(requireInsertIndex + 1, 0, "const workLogsRoutes = require('./routes/work-logs');");
  insertIndex++; // Adjust index since we added a line
}

// Add route registration after reports
lines.splice(insertIndex + 1, 0, "        this.app.use('/api/work-logs', workLogsRoutes);");

// Write back
content = lines.join('\n');
fs.writeFileSync(serverPath, content, 'utf8');

console.log('SUCCESS: work-logs route registered');
console.log('DONE - Please restart container');
