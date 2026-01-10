const fs = require('fs');

const content = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// Find the complete /today route
const lines = content.split('\n');
let inTodayRoute = false;
let braceCount = 0;
let routeLines = [];
let startLine = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("router.get('/today'")) {
    inTodayRoute = true;
    startLine = i;
    braceCount = 0;
  }
  
  if (inTodayRoute) {
    routeLines.push(`${i+1}: ${line}`);
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    
    if (braceCount === 0 && routeLines.length > 1) {
      break;
    }
  }
}

console.log('=== /today Route (Full) ===\n');
console.log(routeLines.join('\n'));
