const fs = require('fs');

console.log('=== Checking database-v2.js exports ===\n');

const dbPath = '/app/dist/database-v2.js';
const content = fs.readFileSync(dbPath, 'utf8');

// Check for dbCall export
const lines = content.split('\n');
const exportLines = lines.filter(line => line.includes('exports') && line.includes('dbCall'));

if (exportLines.length > 0) {
  console.log('Found dbCall exports:');
  exportLines.forEach(line => console.log('  ', line.trim()));
} else {
  console.log('✗ No dbCall export found');
}

// Check if dbCall function exists
const dbCallMatch = content.match(/function dbCall|const dbCall|exports\.dbCall/g);
if (dbCallMatch) {
  console.log('\ndbCall references found:', dbCallMatch.length);
} else {
  console.log('\n✗ No dbCall function found');
}

// Try to require it
try {
  const db = require('/app/dist/database-v2');
  console.log('\nModule exports:', Object.keys(db));
  console.log('dbCall type:', typeof db.dbCall);
} catch (e) {
  console.log('\nError requiring module:', e.message);
}
