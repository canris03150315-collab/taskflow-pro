const fs = require('fs');
const path = '/app/dist/routes/tasks.js';

let content = fs.readFileSync(path, 'utf8');

// Remove all db.transaction calls
// Pattern 1: db.transaction(() => {
content = content.replace(/db\.transaction\(\(\) => \{/g, '{');

// Pattern 2: })(); at the end of transaction blocks
// We need to be careful to only remove the transaction closing, not other closures
// Look for specific pattern with version increment
content = content.replace(/\}\)\(\);(\s+)\/\/ Get updated task/g, '}$1// Get updated task');
content = content.replace(/\}\)\(\);(\s+)\/\/ Record log/g, '}$1// Record log');
content = content.replace(/\}\)\(\);(\s+)res\.json/g, '}$1res.json');

// Also handle await db.transaction pattern
content = content.replace(/await db\.transaction\(\(\) => \{/g, '{');

fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: Removed all db.transaction() calls from tasks.js');
