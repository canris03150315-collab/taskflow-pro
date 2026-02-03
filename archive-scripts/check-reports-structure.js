const fs = require('fs');

console.log('=== Checking reports.js Structure ===\n');

const filePath = '/app/dist/routes/reports.js';
const content = fs.readFileSync(filePath, 'utf8');

// Find GET / route
const getStart = content.indexOf('router.get("/", auth_1.authenticateToken');
if (getStart === -1) {
  console.log('GET route not found');
  process.exit(1);
}

const getEnd = content.indexOf('router.post("/"', getStart);
const getSection = content.substring(getStart, getEnd);

console.log('=== GET / Route Section ===');
console.log(getSection);
console.log('\n=== End of GET Section ===');
