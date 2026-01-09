const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Check if already added
if (content.includes("app.use('/api/backup'")) {
  console.log('Backup route already exists');
  process.exit(0);
}

// Add the route after forum route
const forumRoute = "app.use('/api/forum', require('./routes/forum'));";
if (content.includes(forumRoute)) {
  const backupRoute = "\napp.use('/api/backup', require('./routes/backup'));";
  content = content.replace(forumRoute, forumRoute + backupRoute);
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('SUCCESS: Added backup route to server.js');
} else {
  console.log('ERROR: Could not find forum route');
  process.exit(1);
}
