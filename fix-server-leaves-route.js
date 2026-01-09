const fs = require('fs');

console.log('Fixing server.js leaves route registration...\n');

try {
  const filePath = '/app/dist/server.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the route registration to use leavesRoutes
  const oldRoute = `        this.app.use('/api/leaves', leaves_1.default);`;
  const newRoute = `        this.app.use('/api/leaves', leaves_1.leavesRoutes);`;
  
  if (content.includes('leaves_1.leavesRoutes')) {
    console.log('Route registration already fixed');
  } else if (content.includes('leaves_1.default')) {
    content = content.replace(oldRoute, newRoute);
    console.log('Fixed route registration to use leavesRoutes');
  } else {
    console.log('Route registration not found, skipping');
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nServer.js leaves route fixed successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
