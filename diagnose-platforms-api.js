const fs = require('fs');

console.log('=== Diagnosing /platforms API Response ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
const content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Finding /platforms endpoint...\n');

const lines = content.split('\n');
let inPlatformsRoute = false;
let platformsCode = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("router.get('/platforms'")) {
    inPlatformsRoute = true;
  }
  
  if (inPlatformsRoute) {
    platformsCode.push(`${i + 1}: ${line}`);
    
    if (line.includes('res.json') && platformsCode.length > 5) {
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        platformsCode.push(`${j + 1}: ${lines[j]}`);
        if (lines[j].includes('});') && lines[j].trim() === '});') {
          break;
        }
      }
      break;
    }
  }
}

if (platformsCode.length > 0) {
  console.log('Found /platforms endpoint:\n');
  platformsCode.forEach(line => console.log(line));
  
  console.log('\nStep 2: Checking response format...\n');
  
  const codeStr = platformsCode.join('\n');
  
  if (codeStr.includes('platforms:')) {
    console.log('  Response format: { success: true, platforms: [...] }');
    console.log('  Frontend expects: array directly');
    console.log('  ACTION: Frontend needs to use data.platforms instead of data');
  } else if (codeStr.includes('res.json(platforms)')) {
    console.log('  Response format: array directly');
    console.log('  Frontend expects: array directly');
    console.log('  STATUS: Format matches');
  } else {
    console.log('  Cannot determine response format from code');
  }
} else {
  console.log('ERROR: /platforms endpoint not found');
}

console.log('\n=== Diagnosis Complete ===');
