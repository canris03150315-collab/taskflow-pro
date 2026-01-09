// integrate-report-approval.js
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
  
  // Find the require section
  const requireSection = "const { authenticateToken } = require('../middleware/auth');";
  
  // Add report approval require
  const newRequire = requireSection + "\nconst { reportApprovalRoutes } = require('./report-approval');";
  
  content = content.replace(requireSection, newRequire);
  
  // Find router.get('/') and add approval routes before it
  const routerGetIndex = content.indexOf("router.get('/', authenticateToken");
  if (routerGetIndex === -1) {
    throw new Error('Cannot find router.get entry point');
  }
  
  // Insert approval routes
  const approvalRoutes = "\n// Report approval routes\nrouter.use('/', authenticateToken, reportApprovalRoutes);\n\n";
  content = content.slice(0, routerGetIndex) + approvalRoutes + content.slice(routerGetIndex);
  
  // Write back
  fs.writeFileSync(reportsPath, content, 'utf8');
  
  console.log('\u2705 Integration complete'); // ✅
  console.log('Report approval routes added to /api/reports');
  
} catch (error) {
  console.error('\u274c Error:', error.message); // ❌
  process.exit(1);
}
