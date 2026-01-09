const fs = require('fs');
const path = '/app/dist/routes/tasks.js';

let content = fs.readFileSync(path, 'utf8');

// Find and replace the transaction block in PUT route
// The issue is db.transaction() is not available in SecureDatabase wrapper
// We need to remove the transaction wrapper and execute queries directly

// Replace transaction pattern with direct execution
content = content.replace(
    /await db\.transaction\(\(\) => \{/g,
    '// Transaction removed - execute directly\n        {'
);

// Remove closing transaction parenthesis
content = content.replace(
    /\}\)\(\);(\s+)\/\/ Get updated task/g,
    '}$1// Get updated task'
);

fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: Fixed db.transaction() calls in tasks.js PUT route');
