const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Adding work-logs route to server.js...');

// Find the routes section and add work-logs route
const routeImportPattern = /const reports_1 = require\("\.\/routes\/reports"\);/;
const routeUsePattern = /app\.use\("\/api\/reports", auth_1\.authenticateToken, reports_1\.reportRoutes\);/;

if (!content.includes('work-logs')) {
  // Add import
  content = content.replace(
    routeImportPattern,
    `const reports_1 = require("./routes/reports");\nconst workLogs_1 = require("./routes/work-logs");`
  );
  
  // Add route
  content = content.replace(
    routeUsePattern,
    `app.use("/api/reports", auth_1.authenticateToken, reports_1.reportRoutes);\napp.use("/api/work-logs", auth_1.authenticateToken, workLogs_1.default);`
  );
  
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('SUCCESS: work-logs route added to server.js');
} else {
  console.log('work-logs route already exists');
}
