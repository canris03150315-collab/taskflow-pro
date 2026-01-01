const fs = require('fs');
const content = fs.readFileSync('/app/dist/routes/attendance.js', 'utf8');
console.log(content);
