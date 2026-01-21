const fs = require('fs');

console.log('Fixing KOL PUT route - adding statusColor and weeklyPayNote to req.body destructuring...');

const routePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(routePath, 'utf8');

// Find and replace the destructuring line
const oldDestructure = 'const { facebookId, platformAccount, contactInfo, status, notes } = req.body;';
const newDestructure = 'const { facebookId, platformAccount, contactInfo, status, statusColor, weeklyPayNote, notes } = req.body;';

if (content.includes(oldDestructure)) {
  content = content.replace(oldDestructure, newDestructure);
  fs.writeFileSync(routePath, content, 'utf8');
  console.log('SUCCESS: Added statusColor and weeklyPayNote to req.body destructuring');
} else {
  console.log('ERROR: Could not find the destructuring pattern');
  process.exit(1);
}

console.log('DONE');
