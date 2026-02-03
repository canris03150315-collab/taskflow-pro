const fs = require('fs');

console.log('=== Checking All Platform Revenue API Response Formats ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
const content = fs.readFileSync(routePath, 'utf8');
const lines = content.split('\n');

const endpoints = [
  { name: '/platforms', expectedField: 'platforms' },
  { name: '/stats/platform', expectedField: 'stats' },
  { name: '/stats', expectedField: 'stats' },
  { name: '/stats/by-date', expectedField: 'stats' }
];

endpoints.forEach(endpoint => {
  console.log(`\nChecking ${endpoint.name}:`);
  
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`router.get('${endpoint.name}'`)) {
      found = true;
      
      for (let j = i; j < Math.min(i + 30, lines.length); j++) {
        if (lines[j].includes('res.json')) {
          const responseLines = [];
          for (let k = j; k < Math.min(j + 10, lines.length); k++) {
            responseLines.push(lines[k].trim());
            if (lines[k].includes('});') && lines[k].trim() === '});') {
              break;
            }
          }
          
          const responseStr = responseLines.join(' ');
          console.log(`  Response: ${responseStr.substring(0, 150)}...`);
          
          if (responseStr.includes(`${endpoint.expectedField}:`)) {
            console.log(`  Format: { success: true, ${endpoint.expectedField}: [...] }`);
            console.log(`  Frontend should use: data.${endpoint.expectedField}`);
          } else {
            console.log('  Format: Unknown or direct array');
          }
          break;
        }
      }
      break;
    }
  }
  
  if (!found) {
    console.log('  NOT FOUND');
  }
});

console.log('\n=== Check Complete ===');
