const fs = require('fs');

const filePath = '/app/dist/routes/schedules.js';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== Checking schedules.js API implementation ===\n');

// Find the GET all schedules route
const lines = content.split('\n');
let inGetRoute = false;
let routeLines = [];

lines.forEach((line, idx) => {
    // Look for GET / route
    if (line.includes('router.get') && line.includes('("/",') || line.includes("router.get('/',")) {
        inGetRoute = true;
        routeLines = [];
    }
    
    if (inGetRoute) {
        routeLines.push(`${idx + 1}: ${line}`);
    }
    
    // Stop at next router definition or end of function
    if (inGetRoute && routeLines.length > 5 && (line.includes('router.') && !line.includes('router.get("/",') && !line.includes('router.get(\'/\','))) {
        inGetRoute = false;
    }
});

console.log('GET / route (first 50 lines):');
console.log(routeLines.slice(0, 50).join('\n'));

// Also check for department query
console.log('\n\n=== Searching for department-related queries ===');
const deptLines = lines.filter((line, idx) => {
    return line.includes('department') || line.includes('DEPT_');
}).map((line, idx) => {
    const lineNum = lines.indexOf(line);
    return `${lineNum + 1}: ${line.trim()}`;
});

if (deptLines.length > 0) {
    console.log(deptLines.slice(0, 20).join('\n'));
} else {
    console.log('No department-related code found');
}
