const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== Checking ai-assistant.js content ===\n');

// Check if dbCall is still being used
const dbCallCount = (content.match(/dbCall\(/g) || []).length;
console.log('dbCall usage count:', dbCallCount);

// Check if db.all/db.get/db.run are used
const dbAllCount = (content.match(/db\.all\(/g) || []).length;
const dbGetCount = (content.match(/db\.get\(/g) || []).length;
const dbRunCount = (content.match(/db\.run\(/g) || []).length;

console.log('db.all usage count:', dbAllCount);
console.log('db.get usage count:', dbGetCount);
console.log('db.run usage count:', dbRunCount);

// Show first occurrence of dbCall
const firstDbCall = content.match(/dbCall\([^)]+\)/);
if (firstDbCall) {
  console.log('\nFirst dbCall found:', firstDbCall[0]);
}

// Check the GET /conversations route
const getRouteMatch = content.match(/router\.get\('\/conversations'[\s\S]{0,800}/);
if (getRouteMatch) {
  console.log('\n=== GET /conversations route (first 800 chars) ===');
  console.log(getRouteMatch[0]);
}

if (dbCallCount > 2) {
  console.log('\n❌ ERROR: dbCall still heavily used, fix not applied');
} else if (dbAllCount > 0 || dbGetCount > 0 || dbRunCount > 0) {
  console.log('\n✅ SUCCESS: Direct db methods are used');
} else {
  console.log('\n⚠️ WARNING: Neither dbCall nor direct methods found');
}
