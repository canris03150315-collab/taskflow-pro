const fs = require('fs');

console.log('Fixing leaves.js export...\n');

try {
  const filePath = '/app/dist/routes/leaves.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Change module.exports to exports with named export
  const oldExport = 'module.exports = router;';
  const newExport = 'exports.leavesRoutes = router;';
  
  if (content.includes('exports.leavesRoutes')) {
    console.log('Export already fixed');
  } else {
    content = content.replace(oldExport, newExport);
    console.log('Fixed export to use exports.leavesRoutes');
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nLeaves export fixed successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
