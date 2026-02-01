const fs = require('fs');

console.log('=== Finding Route Registration Pattern ===\n');

const indexPath = '/app/dist/index.js';
const content = fs.readFileSync(indexPath, 'utf8');
const lines = content.split('\n');

// Search for various patterns
console.log('Searching for route patterns...\n');

let foundPatterns = [];

lines.forEach((line, idx) => {
    // Look for any line that might register routes
    if (line.includes('routes/') || 
        line.includes('Router') ||
        (line.includes('require') && line.includes('.js')) ||
        line.includes('app.use') ||
        line.includes('app.get') ||
        line.includes('app.post')) {
        foundPatterns.push({ lineNum: idx + 1, content: line.trim() });
    }
});

console.log(`Found ${foundPatterns.length} potential route-related lines:\n`);

// Show first 50
foundPatterns.slice(0, 50).forEach(p => {
    console.log(`Line ${p.lineNum}: ${p.content}`);
});

if (foundPatterns.length > 50) {
    console.log(`\n... and ${foundPatterns.length - 50} more lines`);
}

console.log('\n=== Complete ===');
