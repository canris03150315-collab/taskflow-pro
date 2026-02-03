const fs = require('fs');

console.log('=== Complete Fix for Platform Revenue Route ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Removing incorrect db-adapter import...');
content = content.replace(
    /const { dbCall } = require\(['"]\.\.?\/db-adapter['"]\);?\n?/g,
    ''
);
console.log('  - Removed db-adapter import');

console.log('\nStep 2: Adding dbCall function definition...');
const dbCallFunction = `
function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error(\`Method \${method} not found on database object\`);
}
`;

// Insert dbCall function after the upload configuration
const insertAfter = 'const upload = multer({';
const insertPosition = content.indexOf(insertAfter);
if (insertPosition !== -1) {
    const endOfUploadConfig = content.indexOf('});', insertPosition) + 3;
    content = content.slice(0, endOfUploadConfig) + '\n' + dbCallFunction + content.slice(endOfUploadConfig);
    console.log('  - Added dbCall function definition');
} else {
    console.log('  - Warning: Could not find insertion point, adding at top');
    content = dbCallFunction + '\n' + content;
}

console.log('\nStep 3: Updating route to accept db parameter...');
// The routes need to be exported as a function that accepts db
// Check if it's already a function export
if (!content.includes('module.exports = (db)') && !content.includes('module.exports = function(db)')) {
    console.log('  - Converting to function export that accepts db parameter');
    
    // Replace module.exports = router with function export
    content = content.replace(
        /module\.exports = router;?/,
        `module.exports = (db) => {
  // Add db to all route handlers via middleware
  router.use((req, res, next) => {
    req.db = db;
    next();
  });
  
  return router;
};`
    );
} else {
    console.log('  - Already using function export');
}

console.log('\nStep 4: Writing changes to file...');
fs.writeFileSync(routePath, content, 'utf8');
console.log('  - File updated successfully');

console.log('\nStep 5: Verifying changes...');
const verifyContent = fs.readFileSync(routePath, 'utf8');
const checks = [
    { name: 'No db-adapter import', test: !verifyContent.includes('db-adapter') },
    { name: 'dbCall function exists', test: verifyContent.includes('function dbCall') },
    { name: 'Function export', test: verifyContent.includes('module.exports = (db)') || verifyContent.includes('module.exports = function(db)') }
];

let allPassed = true;
checks.forEach(check => {
    if (check.test) {
        console.log(`  ✅ ${check.name}`);
    } else {
        console.log(`  ❌ ${check.name}`);
        allPassed = false;
    }
});

if (allPassed) {
    console.log('\n✅ All verifications PASSED');
} else {
    console.log('\n❌ Some verifications FAILED');
    process.exit(1);
}

console.log('\n=== Fix Complete ===');
console.log('\nChanges applied:');
console.log('  1. Removed incorrect db-adapter import');
console.log('  2. Added dbCall function definition (same as kol.js)');
console.log('  3. Updated to function export that accepts db parameter');
console.log('\nNext steps:');
console.log('  1. Update server.js to pass db to the route');
console.log('  2. Restart container');
console.log('  3. Test API');
