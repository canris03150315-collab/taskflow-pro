const fs = require('fs');

console.log('=== Adding FinanceService Import ===');

const filePath = '/app/dist/routes/finance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// Find the last require statement
const lastRequireIndex = content.lastIndexOf("const { authenticateToken } = require('../middleware/auth');");

if (lastRequireIndex !== -1) {
    const insertPos = content.indexOf('\n', lastRequireIndex) + 1;
    content = content.slice(0, insertPos) + 
              "const FinanceService = require('../../services/financeService');\n" +
              content.slice(insertPos);
    console.log('+ Added FinanceService import');
} else {
    console.error('ERROR: Could not find insertion point');
    process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS');
