const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Registering work-logs route...');

// Check if already registered
if (content.includes('work-logs')) {
  console.log('Removing old work-logs registration...');
  // Remove old registration if exists
  content = content.replace(/this\.app\.use\('\/api\/work-logs'[^;]+;/g, '');
}

// Find the line with reports route and add work-logs after it
const reportsLine = "this.app.use('/api/reports', reports_1.reportRoutes);";
const workLogsLine = "this.app.use('/api/work-logs', auth_1.authenticateToken, workLogs_1.default);";

if (content.includes(reportsLine)) {
  content = content.replace(
    reportsLine,
    reportsLine + '\n        ' + workLogsLine
  );
  
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('SUCCESS: work-logs route registered');
} else {
  console.log('ERROR: Could not find reports route');
  process.exit(1);
}
