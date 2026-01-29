const fs = require('fs');

const schedulesPath = '/app/dist/routes/schedules.js';
let content = fs.readFileSync(schedulesPath, 'utf8');

console.log('Fixing auth_1.authenticateToken to authenticateToken...');

// Replace auth_1.authenticateToken with authenticateToken
content = content.replace(/auth_1\.authenticateToken/g, 'authenticateToken');

// Write back
fs.writeFileSync(schedulesPath, content, 'utf8');

console.log('SUCCESS: Fixed auth reference in schedules.js');
