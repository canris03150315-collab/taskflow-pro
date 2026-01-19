const fs = require('fs');

console.log('=== Extracting PUT /contracts/:id Route ===\n');

const filePath = '/app/dist/routes/kol.js';
const content = fs.readFileSync(filePath, 'utf8');

// Find the complete PUT route
const lines = content.split('\n');
let inPutRoute = false;
let braceCount = 0;
let routeLines = [];
let startLine = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("router.put('/contracts/:id'") || line.includes('router.put("/contracts/:id"')) {
    inPutRoute = true;
    startLine = i + 1;
    braceCount = 0;
  }
  
  if (inPutRoute) {
    routeLines.push(line);
    
    // Count braces
    for (let char of line) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
    
    // End of route when braces balance and we see });
    if (braceCount === 0 && line.includes('});')) {
      break;
    }
  }
}

console.log('PUT /contracts/:id route (lines ' + startLine + '-' + (startLine + routeLines.length) + '):');
console.log('---');
console.log(routeLines.join('\n'));
console.log('---');

console.log('\n=== Extraction Complete ===');
