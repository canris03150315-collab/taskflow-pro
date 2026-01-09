const fs = require('fs');

console.log('Adding leaves route to server.js...\n');

try {
  const filePath = '/app/dist/server.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Add import statement after other route imports
  const importLine = 'const leaves_1 = require("./routes/leaves");';
  
  // Find the last route import and add after it
  const systemImportIndex = content.indexOf('const system_1 = require("./routes/system");');
  if (systemImportIndex === -1) {
    console.error('Could not find system import');
    process.exit(1);
  }
  
  // Check if leaves import already exists
  if (content.includes('const leaves_1 = require')) {
    console.log('Leaves import already exists');
  } else {
    const insertPosition = content.indexOf('\n', systemImportIndex) + 1;
    content = content.slice(0, insertPosition) + importLine + '\n' + content.slice(insertPosition);
    console.log('Added leaves import');
  }
  
  // 2. Add route registration
  const routeRegistration = "        this.app.use('/api/leaves', leaves_1.leavesRoutes);";
  
  // Find where routes are registered (look for /api/system)
  const systemRouteIndex = content.indexOf("this.app.use('/api/system'");
  if (systemRouteIndex === -1) {
    console.error('Could not find system route registration');
    process.exit(1);
  }
  
  // Check if leaves route already exists
  if (content.includes("this.app.use('/api/leaves'")) {
    console.log('Leaves route already registered');
  } else {
    const insertPosition = content.indexOf('\n', systemRouteIndex) + 1;
    content = content.slice(0, insertPosition) + routeRegistration + '\n' + content.slice(insertPosition);
    console.log('Added leaves route registration');
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nLeaves route added to server.js successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
