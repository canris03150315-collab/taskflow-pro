const fs = require('fs');

console.log('=== Check routines.js structure ===');

const content = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// Check if dbCall is defined
const hasDbCall = content.includes('function dbCall') || content.includes('const dbCall');
console.log('Has dbCall function:', hasDbCall);

// Check how db is accessed
const dbAccessPattern = content.match(/const db = req\.db/g);
console.log('DB access pattern found:', dbAccessPattern ? dbAccessPattern.length : 0);

// Check the router setup
const routerMatch = content.match(/const router = express\.Router\(\)/);
console.log('Router setup found:', !!routerMatch);

// Show first 100 lines
const lines = content.split('\n');
console.log('\n--- First 30 lines ---');
lines.slice(0, 30).forEach((line, i) => {
  console.log(`${i + 1}: ${line}`);
});

console.log('\n--- Lines around /today route (110-130) ---');
lines.slice(109, 130).forEach((line, i) => {
  console.log(`${i + 110}: ${line}`);
});

console.log('\n=== Check complete ===');
