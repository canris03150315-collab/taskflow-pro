const fs = require('fs');

// Check if backup routes exist in index.js
const indexPath = '/app/dist/index.js';
const indexContent = fs.readFileSync(indexPath, 'utf8');

console.log('=== Checking for backup routes ===');

// Check for backup route registration
if (indexContent.includes('/backup')) {
  console.log('✓ Found /backup route registration');
} else {
  console.log('✗ No /backup route registration found');
}

// Check for backup router import
if (indexContent.includes('backup')) {
  const lines = indexContent.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('backup')) {
      console.log(`Line ${i + 1}: ${line.trim()}`);
    }
  });
}

// Check if backup.js exists
const backupRoutePath = '/app/dist/routes/backup.js';
if (fs.existsSync(backupRoutePath)) {
  console.log('\n✓ backup.js exists');
  const backupContent = fs.readFileSync(backupRoutePath, 'utf8');
  console.log('Routes found:');
  const routeMatches = backupContent.match(/router\.(get|post|put|delete)\(['"](.*?)['"]/g);
  if (routeMatches) {
    routeMatches.forEach(r => console.log('  -', r));
  }
} else {
  console.log('\n✗ backup.js does NOT exist');
}
