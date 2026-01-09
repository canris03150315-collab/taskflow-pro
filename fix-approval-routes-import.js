// fix-approval-routes-import.js
const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Before fix:');
const beforeMatch = content.match(/require\(['"]\.\/report-approval['"]\)/);
console.log(beforeMatch ? beforeMatch[0] : 'Pattern not found');

// Fix the import path
content = content.replace(
  /require\(['"]\.\/report-approval['"]\)/g,
  "require('./report-approval-routes')"
);

console.log('\nAfter fix:');
const afterMatch = content.match(/require\(['"]\.\/report-approval-routes['"]\)/);
console.log(afterMatch ? afterMatch[0] : 'Pattern not found');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Fixed import path in reports.js');
