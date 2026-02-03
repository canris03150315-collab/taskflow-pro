const fs = require('fs');

console.log('Fixing work-logs.js export...');

const routePath = '/app/dist/routes/work-logs.js';
let content = fs.readFileSync(routePath, 'utf8');

// Fix the export format to match other routes
content = content.replace(/module\.exports = \{ workLogRoutes: router \};?/, 'module.exports = router;');

// Also add it if it doesn't exist
if (!content.includes('module.exports')) {
  content += '\nmodule.exports = router;\n';
}

fs.writeFileSync(routePath, content, 'utf8');
console.log('SUCCESS: Fixed export format');
console.log('DONE');
