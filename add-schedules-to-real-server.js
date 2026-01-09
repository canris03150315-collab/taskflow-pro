const fs = require('fs');

console.log('Adding schedules route to server.js...\n');

try {
  const serverPath = '/app/dist/server.js';
  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Check if already added
  if (content.includes('schedulesRoutes')) {
    console.log('Schedules route already exists');
    process.exit(0);
  }
  
  // Find the leaves route line
  const leavesLine = "this.app.use('/api/leaves', leaves_1.leavesRoutes);";
  
  if (!content.includes(leavesLine)) {
    console.error('ERROR: Could not find leaves route');
    process.exit(1);
  }
  
  // Add schedules import after leaves import
  content = content.replace(
    /const leaves_1 = require\("\.\/routes\/leaves"\);/,
    'const leaves_1 = require("./routes/leaves");\nconst schedules_1 = require("./routes/schedules");'
  );
  
  // Add schedules route after leaves route
  content = content.replace(
    leavesLine,
    leavesLine + '\n        this.app.use(\'/api/schedules\', schedules_1.schedulesRoutes(this.db, this.wsServer));'
  );
  
  fs.writeFileSync(serverPath, content, 'utf8');
  
  console.log('OK Schedules route added successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
