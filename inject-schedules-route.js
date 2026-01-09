const fs = require('fs');

console.log('Injecting schedules route into server.js...\n');

try {
  const serverPath = '/app/dist/index.js';
  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Check if already injected
  if (content.includes('schedulesRoutes')) {
    console.log('Schedules route already exists');
    process.exit(0);
  }
  
  // Find where routes are defined - look for any route registration pattern
  const routePattern = /this\.app\.use\(['"]\/api\/\w+['"]/;
  
  if (!routePattern.test(content)) {
    console.error('ERROR: Could not find route registration pattern');
    process.exit(1);
  }
  
  // Find the last occurrence of route registration
  const matches = content.match(/this\.app\.use\(['"]\/api\/\w+['"],.*?\);/gs);
  
  if (!matches || matches.length === 0) {
    console.error('ERROR: No route registrations found');
    process.exit(1);
  }
  
  const lastRoute = matches[matches.length - 1];
  const lastRouteIndex = content.lastIndexOf(lastRoute);
  const insertPosition = lastRouteIndex + lastRoute.length;
  
  // Prepare the schedules route code
  const schedulesImport = '\nconst { schedulesRoutes } = require("./routes/schedules");';
  const schedulesRoute = '\n        this.app.use("/api/schedules", schedulesRoutes(this.db, this.wsServer));';
  
  // Insert at the end of the file, before the last closing braces
  const beforeInsert = content.substring(0, insertPosition);
  const afterInsert = content.substring(insertPosition);
  
  // Add import at the top of the class or near other requires
  const requirePattern = /const.*require\("\.\/routes\/.*?\);/;
  const requireMatch = content.match(requirePattern);
  
  if (requireMatch) {
    const requireIndex = content.indexOf(requireMatch[0]);
    const requireEnd = requireIndex + requireMatch[0].length;
    content = content.substring(0, requireEnd) + schedulesImport + content.substring(requireEnd);
  }
  
  // Now add the route registration
  content = content.substring(0, insertPosition + schedulesImport.length) + schedulesRoute + content.substring(insertPosition + schedulesImport.length);
  
  fs.writeFileSync(serverPath, content, 'utf8');
  
  console.log('OK Schedules route injected successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
