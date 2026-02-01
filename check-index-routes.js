const fs = require('fs');

console.log('=== Checking index.js Route Registrations ===\n');

const indexPath = '/app/dist/index.js';
const content = fs.readFileSync(indexPath, 'utf8');
const lines = content.split('\n');

console.log('Looking for route registrations...\n');

// Find all app.use statements
let routeLines = [];
lines.forEach((line, idx) => {
    if (line.includes('app.use') && (line.includes('/api') || line.includes('routes'))) {
        routeLines.push({ lineNum: idx + 1, content: line.trim() });
    }
});

console.log('Found route registrations:');
routeLines.forEach(r => {
    console.log(`Line ${r.lineNum}: ${r.content}`);
});

console.log('\n=== Complete ===');
