const fs = require('fs');

console.log('Fixing KOL routes authentication middleware order...');

try {
  const kolRoutesPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolRoutesPath, 'utf8');
  
  // The issue: checkKOLPermission middleware is applied globally before authenticateToken
  // We need to ensure authenticateToken is called first
  
  // Find and remove the global middleware application
  content = content.replace(/router\.use\(authenticateToken, checkKOLPermission\);?\n?/g, '');
  
  // Also remove standalone checkKOLPermission if it exists
  content = content.replace(/router\.use\(checkKOLPermission\);?\n?/g, '');
  
  // Now we need to add authenticateToken to each route individually
  // Find all router.get, router.post, router.put, router.delete calls
  
  // Replace patterns where checkKOLPermission is used without authenticateToken
  content = content.replace(
    /router\.(get|post|put|delete)\((['"`][^'"`]+['"`]),\s*checkKOLPermission,/g,
    'router.$1($2, authenticateToken, checkKOLPermission,'
  );
  
  // For routes that might not have checkKOLPermission yet
  // Add authenticateToken if it's missing
  const routePattern = /router\.(get|post|put|delete)\((['"`]\/[^'"`]+['"`]),\s*async\s*\(/g;
  content = content.replace(routePattern, 'router.$1($2, authenticateToken, checkKOLPermission, async (');
  
  fs.writeFileSync(kolRoutesPath, content, 'utf8');
  console.log('✅ KOL routes authentication middleware order fixed');
  
} catch (error) {
  console.error('❌ Error fixing KOL routes:', error);
  process.exit(1);
}
