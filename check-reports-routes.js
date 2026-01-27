const fs = require('fs');

console.log('=== Check Reports Routes ===\n');

const reportsPath = '/app/dist/routes/reports.js';
const content = fs.readFileSync(reportsPath, 'utf8');

console.log('1. File size:', content.length, 'bytes\n');

console.log('2. Searching for approval routes:\n');

const approvalRoutes = [
  '/approval/pending',
  '/approval/status',
  '/approval/request',
  '/approval/approve',
  '/approval/reject',
  '/approval/revoke',
  '/approval/audit-log'
];

approvalRoutes.forEach(route => {
  const regex = new RegExp(`router\\.(get|post|put|delete)\\(['"\`]${route.replace(/\//g, '\\/')}['"\`]`, 'i');
  if (regex.test(content)) {
    console.log(`  [FOUND] ${route}`);
  } else {
    console.log(`  [MISSING] ${route}`);
  }
});

console.log('\n3. Check router export:\n');
if (content.includes('module.exports') || content.includes('exports.')) {
  console.log('  [OK] Router is exported');
  
  const exportMatch = content.match(/module\.exports\s*=\s*{([^}]+)}/);
  if (exportMatch) {
    console.log('  Export:', exportMatch[1].trim());
  }
} else {
  console.log('  [ERROR] No export found');
}

console.log('\n4. Count total routes:\n');
const getRoutes = (content.match(/router\.get\(/g) || []).length;
const postRoutes = (content.match(/router\.post\(/g) || []).length;
const putRoutes = (content.match(/router\.put\(/g) || []).length;
const deleteRoutes = (content.match(/router\.delete\(/g) || []).length;

console.log(`  GET: ${getRoutes}`);
console.log(`  POST: ${postRoutes}`);
console.log(`  PUT: ${putRoutes}`);
console.log(`  DELETE: ${deleteRoutes}`);
console.log(`  Total: ${getRoutes + postRoutes + putRoutes + deleteRoutes}`);
