const fs = require('fs');
const path = '/app/dist/routes/auth.js';

let content = fs.readFileSync(path, 'utf8');

// Remove the early export at line 35
content = content.replace('exports.authRoutes = router;', '// exports moved to end');

// Add export at the end of the file
if (!content.trim().endsWith('exports.authRoutes = router;')) {
    content = content.trim() + '\nexports.authRoutes = router;\n';
}

fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: Moved exports.authRoutes to end of auth.js');
