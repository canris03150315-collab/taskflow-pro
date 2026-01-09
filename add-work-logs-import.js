const fs = require('fs');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Adding work-logs import to server.js...');

// Check if already imported
if (content.includes('work-logs')) {
  console.log('work-logs already imported');
} else {
  // Find the reports import line and add work-logs import after it
  const reportsImport = 'const reports_1 = require("./routes/reports");';
  const workLogsImport = 'const workLogs_1 = require("./routes/work-logs");';
  
  if (content.includes(reportsImport)) {
    content = content.replace(
      reportsImport,
      reportsImport + '\n' + workLogsImport
    );
    
    fs.writeFileSync(serverPath, content, 'utf8');
    console.log('SUCCESS: work-logs import added');
  } else {
    console.log('ERROR: Could not find reports import');
    process.exit(1);
  }
}
