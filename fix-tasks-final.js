const fs = require('fs');
const path = '/app/dist/routes/tasks.js';

let content = fs.readFileSync(path, 'utf8');

// Find the transaction block and remove it
// Pattern: db.transaction(() => { ... })();
// We need to remove the wrapper but keep the inner code

// Replace the transaction start
content = content.replace(
    /db\.transaction\(\(\) => \{/g,
    '// Transaction removed - execute directly'
);

// Replace the transaction end })();
content = content.replace(
    /\}\)\(\);(\s+)\/\/ 記錄日誌/g,
    '$1// 記錄日誌'
);

// Also handle any await db.transaction patterns
content = content.replace(
    /await db\.transaction\(\(\) => \{/g,
    '// Transaction removed - execute directly'
);

fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: Removed db.transaction() wrapper from tasks.js');
