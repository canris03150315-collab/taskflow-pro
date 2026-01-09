// Fix TaskStatus enum values in tasks.js (Pure ASCII)
const fs = require('fs');

console.log('Fixing TaskStatus enum values in tasks.js...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Check if already fixed
if (!content.includes('types_1.TaskStatus')) {
    console.log('TaskStatus enum already fixed or not found');
    process.exit(0);
}

// Replace all TaskStatus enum references with correct string values
const replacements = [
    { from: /types_1\.TaskStatus\.OPEN/g, to: '"Open"' },
    { from: /types_1\.TaskStatus\.ASSIGNED/g, to: '"Assigned"' },
    { from: /types_1\.TaskStatus\.IN_PROGRESS/g, to: '"In Progress"' },
    { from: /types_1\.TaskStatus\.COMPLETED/g, to: '"Completed"' },
    { from: /types_1\.TaskStatus\.CANCELLED/g, to: '"Cancelled"' }
];

let changeCount = 0;
replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
        changeCount += matches.length;
        content = content.replace(from, to);
    }
});

if (changeCount === 0) {
    console.log('No TaskStatus enum references found');
    process.exit(0);
}

fs.writeFileSync(tasksPath, content, 'utf8');

console.log('SUCCESS: Fixed', changeCount, 'TaskStatus enum references');
console.log('Status values now match database CHECK constraint:');
console.log('  - Open');
console.log('  - Assigned');
console.log('  - In Progress');
console.log('  - Completed');
console.log('  - Cancelled');
