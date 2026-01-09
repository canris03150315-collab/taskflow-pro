const fs = require('fs');

console.log('Adding leaves route to server.js...\n');

try {
  const filePath = '/app/dist/server.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Add import at the top with other route imports
  const importPattern = "const announcements_1 = require(\"./routes/announcements\");";
  const newImport = `const announcements_1 = require("./routes/announcements");
const leaves_1 = require("./routes/leaves");`;
  
  if (content.includes('const leaves_1 = require')) {
    console.log('Leaves import already exists');
  } else {
    content = content.replace(importPattern, newImport);
    console.log('Added leaves import');
  }
  
  // 2. Add route registration in initializeRoutes with correct export name
  const routePattern = `        this.app.use('/api/announcements', announcements_1.announcementsRoutes);`;
  const newRoute = `        this.app.use('/api/announcements', announcements_1.announcementsRoutes);
        this.app.use('/api/leaves', leaves_1.leavesRoutes);`;
  
  if (content.includes("this.app.use('/api/leaves'")) {
    console.log('Leaves route already registered');
  } else {
    content = content.replace(routePattern, newRoute);
    console.log('Added leaves route registration');
  }
  
  // Write back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nLeaves route added successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
