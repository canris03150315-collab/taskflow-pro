const fs = require('fs');
const Database = require('better-sqlite3');

console.log('=== Diagnosing and fixing work-logs route ===');

// Step 1: Check if work_logs table exists
console.log('\n1. Checking database...');
try {
  const db = new Database('/app/data/taskflow.db');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='work_logs'").all();
  
  if (tables.length === 0) {
    console.log('ERROR: work_logs table does NOT exist');
    process.exit(1);
  } else {
    console.log('SUCCESS: work_logs table exists');
    const count = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
    console.log(`  Records: ${count.count}`);
  }
  db.close();
} catch (error) {
  console.error('ERROR checking database:', error.message);
  process.exit(1);
}

// Step 2: Check if route file exists
console.log('\n2. Checking route file...');
const routePath = '/app/dist/routes/work-logs.js';
if (!fs.existsSync(routePath)) {
  console.log('ERROR: work-logs.js route file does NOT exist');
  process.exit(1);
} else {
  console.log('SUCCESS: work-logs.js route file exists');
}

// Step 3: Check server.js route registration
console.log('\n3. Checking server.js route registration...');
const serverPath = '/app/dist/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

if (serverContent.includes("this.app.use('/api/work-logs'")) {
  console.log('INFO: work-logs route already registered in server.js');
  console.log('=== Diagnosis complete - route should be working ===');
  process.exit(0);
}

console.log('ISSUE: work-logs route NOT registered in server.js');
console.log('\n4. Fixing route registration...');

// Find the reports route registration line
const lines = serverContent.split('\n');
let reportLineIndex = -1;
let reportRequireIndex = -1;

lines.forEach((line, index) => {
  if (line.includes("this.app.use('/api/reports'")) {
    reportLineIndex = index;
  }
  if (line.includes("const reportRoutes = require('./routes/reports')") || 
      line.includes("const { reportRoutes } = require('./routes/reports')")) {
    reportRequireIndex = index;
  }
});

if (reportLineIndex === -1 || reportRequireIndex === -1) {
  console.log('ERROR: Could not find reports route pattern');
  process.exit(1);
}

// Add require statement
lines.splice(reportRequireIndex + 1, 0, "const workLogsRoutes = require('./routes/work-logs');");

// Add route registration (adjust index because we added a line)
lines.splice(reportLineIndex + 2, 0, "        this.app.use('/api/work-logs', workLogsRoutes);");

// Write back
serverContent = lines.join('\n');
fs.writeFileSync(serverPath, serverContent, 'utf8');

console.log('SUCCESS: work-logs route registered in server.js');
console.log('  - Added require statement after reports');
console.log('  - Added route registration after reports');
console.log('\n=== Fix complete - please restart container ===');
