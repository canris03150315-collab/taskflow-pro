const fs = require('fs');

console.log('=== Check /history Route Implementation ===\n');

const routinesPath = '/app/dist/routes/routines.js';
const content = fs.readFileSync(routinesPath, 'utf8');

// Find the /history route
const historyRouteStart = content.indexOf("router.get('/history'");
if (historyRouteStart === -1) {
  console.log('ERROR: /history route not found!');
  process.exit(1);
}

// Extract the route (find the matching closing brace)
let braceCount = 0;
let inRoute = false;
let routeCode = '';
let i = historyRouteStart;

while (i < content.length) {
  const char = content[i];
  routeCode += char;
  
  if (char === '{') {
    braceCount++;
    inRoute = true;
  } else if (char === '}') {
    braceCount--;
    if (inRoute && braceCount === 0) {
      break;
    }
  }
  i++;
}

console.log('History route code:');
console.log(routeCode);
console.log('\n=== Analysis ===');

// Check if it maps completed_items to items
const hasItemsMapping = routeCode.includes('items:') && routeCode.includes('completed_items');
console.log('Has items mapping:', hasItemsMapping);

// Check if it parses JSON
const hasJSONParse = routeCode.includes('JSON.parse');
console.log('Has JSON.parse:', hasJSONParse);

// Check return format
const hasRecordsArray = routeCode.includes('records:');
console.log('Returns records array:', hasRecordsArray);

console.log('\n=== Check Complete ===');
