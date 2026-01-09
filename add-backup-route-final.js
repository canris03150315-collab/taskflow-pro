const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Adding backup route to server.js...');

// Check if already exists
if (content.includes("'/api/backup'")) {
  console.log('Backup route already exists');
  process.exit(0);
}

// Find line 129 (schedules route)
const lines = content.split('\n');
const targetLineIndex = lines.findIndex(line => line.includes("'/api/schedules'"));

if (targetLineIndex === -1) {
  console.log('ERROR: Could not find schedules route');
  process.exit(1);
}

console.log('Found schedules route at line', targetLineIndex + 1);

// Insert backup route after schedules
const backupRoute = "        this.app.use('/api/backup', require('./routes/backup'));";
lines.splice(targetLineIndex + 1, 0, backupRoute);

content = lines.join('\n');
fs.writeFileSync(serverPath, content, 'utf8');
console.log('SUCCESS: Added backup route at line', targetLineIndex + 2);
