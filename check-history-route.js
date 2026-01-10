const fs = require('fs');

console.log('=== Check /routines/history route ===\n');

const content = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// Find the history route
const historyMatch = content.match(/router\.get\('\/history'[\s\S]*?(?=router\.|module\.exports)/);

if (historyMatch) {
  console.log('History route found:');
  console.log(historyMatch[0]);
} else {
  console.log('History route NOT FOUND');
}
