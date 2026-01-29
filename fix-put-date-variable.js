const fs = require('fs');

console.log('=== Fixing PUT route date variable ===');

const filePath = '/app/dist/routes/finance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// Fix the destructuring to include date
const oldDestructure = "const { type, amount, description, category, status } = req.body;";
const newDestructure = "const { type, amount, description, category, date, status } = req.body;";

if (content.includes(oldDestructure)) {
    content = content.replace(oldDestructure, newDestructure);
    console.log('+ Fixed date variable in PUT route');
} else {
    console.log('! Pattern not found');
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS');
