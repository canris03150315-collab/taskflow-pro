const fs = require('fs');

console.log('Fixing KOL routes - adding authenticateToken import...');

try {
  const kolRoutesPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolRoutesPath, 'utf8');
  
  // Check if authenticateToken is already imported
  if (content.includes("require('../middleware/auth')")) {
    console.log('✅ authenticateToken import already exists');
  } else {
    // Add authenticateToken import after uuid import
    const uuidPattern = /const { v4: uuidv4 } = require\('uuid'\);/;
    
    if (!uuidPattern.test(content)) {
      console.error('❌ Could not find uuid import');
      process.exit(1);
    }
    
    const authImport = "const { authenticateToken } = require('../middleware/auth');";
    content = content.replace(uuidPattern, `$&\n${authImport}`);
    
    console.log('✅ Added authenticateToken import');
  }
  
  // Now ensure all routes use authenticateToken and checkKOLPermission
  // Replace routes that only have checkKOLPermission
  content = content.replace(
    /router\.(get|post|put|delete)\((['"`][^'"`]+['"`]),\s*checkKOLPermission,\s*async\s*\(/g,
    'router.$1($2, authenticateToken, checkKOLPermission, async ('
  );
  
  console.log('✅ Updated all routes to use authenticateToken');
  
  fs.writeFileSync(kolRoutesPath, content, 'utf8');
  console.log('✅ KOL routes fixed successfully');
  
} catch (error) {
  console.error('❌ Error fixing KOL routes:', error);
  process.exit(1);
}
