// integrate-report-approval-v2.js
// Integrate report approval routes into main app
const fs = require('fs');

console.log('Integrating report approval routes...');

try {
  // Read reports.js
  const reportsPath = '/app/dist/routes/reports.js';
  let content = fs.readFileSync(reportsPath, 'utf8');
  
  // Check if already integrated
  if (content.includes('report-approval')) {
    console.log('\u2705 Already integrated'); // ✅
    process.exit(0);
  }
  
  // Find the auth require line
  const authRequire = "const auth_1 = require(\"../middleware/auth\");";
  
  // Add report approval require after auth
  const newRequire = authRequire + "\nconst { reportApprovalRoutes } = require('./report-approval');";
  
  content = content.replace(authRequire, newRequire);
  
  // Find the first router.get line and add approval routes before it
  const firstRouterGet = 'router.get("/", auth_1.authenticateToken';
  const routerGetIndex = content.indexOf(firstRouterGet);
  
  if (routerGetIndex === -1) {
    throw new Error('Cannot find router.get entry point');
  }
  
  // Insert approval routes before first GET route
  const approvalRoutes = "// Report approval routes\nrouter.use('/', auth_1.authenticateToken, reportApprovalRoutes);\n\n";
  content = content.slice(0, routerGetIndex) + approvalRoutes + content.slice(routerGetIndex);
  
  // Write back
  fs.writeFileSync(reportsPath, content, 'utf8');
  
  console.log('\u2705 Integration complete'); // ✅
  console.log('Report approval routes added to /api/reports');
  
} catch (error) {
  console.error('\u274c Error:', error.message); // ❌
  process.exit(1);
}
