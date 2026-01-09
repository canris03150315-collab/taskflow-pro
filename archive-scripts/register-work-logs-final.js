const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Adding work-logs to server.js...');

// Step 1: Add import
const reportsImport = 'const reports_1 = require("./routes/reports");';
const workLogsImport = 'const workLogs_1 = require("./routes/work-logs");';

if (!content.includes('work-logs')) {
  content = content.replace(
    reportsImport,
    reportsImport + '\n' + workLogsImport
  );
  console.log('Added import');
} else {
  console.log('Import already exists');
}

// Step 2: Add route registration
const reportsRoute = "this.app.use('/api/reports', reports_1.reportRoutes);";
const workLogsRoute = "this.app.use('/api/work-logs', auth_1.authenticateToken, workLogs_1.workLogRoutes);";

if (!content.includes("app.use('/api/work-logs'")) {
  content = content.replace(
    reportsRoute,
    reportsRoute + '\n        ' + workLogsRoute
  );
  console.log('Added route registration');
} else {
  console.log('Route already registered');
}

fs.writeFileSync(serverPath, content, 'utf8');
console.log('SUCCESS: work-logs integrated into server.js');
