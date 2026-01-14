const fs = require('fs');

console.log('Registering KOL routes in server.js...');

try {
  const serverPath = '/app/dist/server.js';
  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Check if KOL routes are already registered
  if (content.includes("app.use('/api/kol'")) {
    console.log('⚠️  KOL routes already registered');
    process.exit(0);
  }
  
  // Find the position to insert (after other route registrations)
  const routePattern = /app\.use\('\/api\/finance',\s*financeRoutes\);/;
  
  if (!routePattern.test(content)) {
    console.error('❌ Could not find finance routes registration point');
    process.exit(1);
  }
  
  // Insert KOL routes registration
  const kolRoutesImport = "const kolRoutes = require('./routes/kol');";
  const kolRoutesUse = "app.use('/api/kol', kolRoutes);";
  
  // Add import at the top with other route imports
  const importPattern = /(const financeRoutes = require\('\.\/routes\/finance'\);)/;
  content = content.replace(importPattern, `$1\n${kolRoutesImport}`);
  
  // Add route registration after finance routes
  content = content.replace(routePattern, `$&\n${kolRoutesUse}`);
  
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('✅ KOL routes registered successfully in server.js');
  
} catch (error) {
  console.error('❌ Error registering KOL routes:', error);
  process.exit(1);
}
