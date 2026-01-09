const fs = require('fs');

console.log('Adding schedules route to server.js...\n');

try {
  const filePath = '/app/dist/index.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already added
  if (content.includes('schedules_1')) {
    console.log('Schedules route already exists');
    process.exit(0);
  }
  
  // Find the leaves route import
  const leavesImportMatch = content.match(/const leaves_1 = require\("\.\/routes\/leaves"\);/);
  if (!leavesImportMatch) {
    console.error('ERROR: Could not find leaves import');
    process.exit(1);
  }
  
  // Add schedules import after leaves
  content = content.replace(
    /const leaves_1 = require\("\.\/routes\/leaves"\);/,
    `const leaves_1 = require("./routes/leaves");\nconst schedules_1 = require("./routes/schedules");`
  );
  
  // Find the leaves route registration
  const leavesRouteMatch = content.match(/this\.app\.use\('\/api\/leaves', leaves_1\.leavesRoutes\);/);
  if (!leavesRouteMatch) {
    console.error('ERROR: Could not find leaves route registration');
    process.exit(1);
  }
  
  // Add schedules route after leaves
  content = content.replace(
    /this\.app\.use\('\/api\/leaves', leaves_1\.leavesRoutes\);/,
    `this.app.use('/api/leaves', leaves_1.leavesRoutes);\n        this.app.use('/api/schedules', schedules_1.schedulesRoutes(this.db, this.wsServer));`
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('OK Schedules route added successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
