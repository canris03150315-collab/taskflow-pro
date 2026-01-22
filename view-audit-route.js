const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
const content = fs.readFileSync(filePath, 'utf8');

// Find the audit-log route
const lines = content.split('\n');
let inAuditRoute = false;
let routeLines = [];

lines.forEach((line, idx) => {
    if (line.includes('router.get("/approval/audit-log"')) {
        inAuditRoute = true;
    }
    
    if (inAuditRoute) {
        routeLines.push(`${idx + 1}: ${line}`);
    }
    
    if (inAuditRoute && line.includes('});') && routeLines.length > 10) {
        inAuditRoute = false;
    }
});

console.log('=== Audit Log Route (first 30 lines) ===');
console.log(routeLines.slice(0, 30).join('\n'));
