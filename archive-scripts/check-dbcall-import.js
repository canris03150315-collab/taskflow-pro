const fs = require('fs');

const filePath = '/app/dist/routes/departments.js';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== Checking dbCall import ===\n');

// Check for dbCall import
const lines = content.split('\n').slice(0, 30);
lines.forEach((line, i) => {
  if (line.includes('require') || line.includes('dbCall')) {
    console.log(`Line ${i + 1}: ${line}`);
  }
});

// Check if dbCall is used
const dbCallUsage = content.match(/dbCall\(/g);
if (dbCallUsage) {
  console.log(`\ndbCall is used ${dbCallUsage.length} times`);
}
