const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Check if already added
if (content.includes("app.use('/api/backup'")) {
  console.log('Backup route already exists');
  process.exit(0);
}

// Find the system route and add backup route before it
const systemRoute = "this.app.use('/api/system', system_1.systemRoutes);";
if (content.includes(systemRoute)) {
  const backupRoute = "this.app.use('/api/backup', require('./routes/backup'));\n        ";
  content = content.replace(systemRoute, backupRoute + systemRoute);
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('SUCCESS: Added backup route to server.js');
} else {
  console.log('ERROR: Could not find system route');
  process.exit(1);
}
