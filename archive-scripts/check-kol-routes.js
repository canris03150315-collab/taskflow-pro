const fs = require('fs');

console.log('=== Checking KOL Routes ===\n');

const kolRoutesPath = '/app/dist/routes/kol.js';

try {
  const content = fs.readFileSync(kolRoutesPath, 'utf8');
  
  // Find POST /contracts route
  const postContractMatch = content.match(/router\.post\(['"]\/contracts['"]\s*,[\s\S]{0,2000}?\}\s*\);/);
  
  if (postContractMatch) {
    console.log('Found POST /contracts route:');
    console.log('---');
    console.log(postContractMatch[0].substring(0, 1500));
    console.log('---\n');
  } else {
    console.log('ERROR: POST /contracts route not found!\n');
  }
  
  // Check if authenticateToken is used
  if (content.includes('authenticateToken')) {
    console.log('authenticateToken middleware: FOUND');
  } else {
    console.log('WARNING: authenticateToken middleware not found');
  }
  
  // Check for dbCall usage
  if (content.includes('dbCall')) {
    console.log('dbCall adapter: FOUND');
  } else {
    console.log('WARNING: dbCall adapter not found');
  }
  
  console.log('\n=== Check Complete ===');
} catch (error) {
  console.error('Error reading kol.js:', error.message);
}
