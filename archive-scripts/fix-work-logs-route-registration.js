const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Registering work-logs route in server.js...');

// Find the reports route registration line
const reportsRoutePattern = /this\.app\.use\('\/api\/reports', reports_1\.reportRoutes\);/;

// Check if work-logs route already registered
if (content.includes("app.use('/api/work-logs'") || content.includes('app.use("/api/work-logs"')) {
  console.log('work-logs route already registered');
} else {
  // Add work-logs route after reports route
  content = content.replace(
    reportsRoutePattern,
    `this.app.use('/api/reports', reports_1.reportRoutes);\n        this.app.use('/api/work-logs', auth_1.authenticateToken, workLogs_1.default);`
  );
  
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('SUCCESS: work-logs route registered in server.js');
}
