const fs = require('fs');

console.log('Fixing KOL PUT route - field name compatibility...');

const routePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(routePath, 'utf8');

// Change destructuring to accept both platformId and facebookId
const oldDestructure = 'const { facebookId, platformAccount, contactInfo, status, statusColor, weeklyPayNote, notes } = req.body;';
const newDestructure = 'const { platformId, facebookId, platformAccount, contactInfo, status, statusColor, weeklyPayNote, notes } = req.body;\n    const actualFacebookId = platformId || facebookId;';

if (content.includes(oldDestructure)) {
  content = content.replace(oldDestructure, newDestructure);
  
  // Update the SQL run to use actualFacebookId
  content = content.replace(
    '.run(facebookId, platformAccount,',
    '.run(actualFacebookId, platformAccount,'
  );
  
  fs.writeFileSync(routePath, content, 'utf8');
  console.log('SUCCESS: Updated to accept both platformId and facebookId');
} else {
  console.log('ERROR: Could not find the destructuring pattern');
  process.exit(1);
}

console.log('DONE');
