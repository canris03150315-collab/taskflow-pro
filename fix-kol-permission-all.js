const fs = require('fs');

console.log('=== Fix KOL Permission - Allow All Roles ===');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // Change permission check to allow all authenticated users
  const oldCheck = "if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {";
  const newCheck = "// Allow all authenticated users to access KOL management\n  if (!currentUser) {";
  
  if (content.includes(oldCheck)) {
    content = content.replace(oldCheck, newCheck);
    console.log('SUCCESS: Updated permission check to allow all roles');
  } else {
    console.log('Permission check pattern not found, checking alternative...');
    
    // Try alternative pattern
    const altCheck = /if\s*\(\s*currentUser\.role\s*!==\s*'BOSS'\s*&&\s*currentUser\.role\s*!==\s*'MANAGER'\s*\)/;
    if (altCheck.test(content)) {
      content = content.replace(altCheck, "// Allow all authenticated users\n  if (!currentUser)");
      console.log('SUCCESS: Updated with regex');
    } else {
      console.log('WARNING: Could not find permission check pattern');
    }
  }
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n=== Done ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
