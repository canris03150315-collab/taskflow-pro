const fs = require('fs');

console.log('Registering schedules route...\n');

try {
  const serverPath = '/app/dist/index.js';
  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Check if already registered
  if (content.includes('/api/schedules')) {
    console.log('Schedules route already registered');
    process.exit(0);
  }
  
  // Find a good place to add the route - after any existing API routes
  // Look for the pattern of app.use with /api
  const apiRoutePattern = /this\.app\.use\('\/api\/\w+'/g;
  const matches = content.match(apiRoutePattern);
  
  if (!matches || matches.length === 0) {
    console.error('ERROR: Could not find any API routes');
    process.exit(1);
  }
  
  // Get the last API route
  const lastRoute = matches[matches.length - 1];
  const lastRouteIndex = content.lastIndexOf(lastRoute);
  
  // Find the end of that line (semicolon)
  const lineEnd = content.indexOf(';', lastRouteIndex);
  
  if (lineEnd === -1) {
    console.error('ERROR: Could not find line end');
    process.exit(1);
  }
  
  // Insert the schedules route after the last API route
  const before = content.substring(0, lineEnd + 1);
  const after = content.substring(lineEnd + 1);
  
  const schedulesRoute = `\n        const { schedulesRoutes } = require('./routes/schedules');\n        this.app.use('/api/schedules', schedulesRoutes(this.db, this.wsServer));`;
  
  content = before + schedulesRoute + after;
  
  fs.writeFileSync(serverPath, content, 'utf8');
  
  console.log('OK Schedules route registered successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
