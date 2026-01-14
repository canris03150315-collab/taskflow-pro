const fs = require('fs');

console.log('=== Fix KOL Create Profile API ===');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // 1. Fix validation - accept platformId OR facebookId
  console.log('\n1. Fixing validation...');
  const oldValidation = "if (!facebookId || !platformAccount) {";
  const newValidation = "const actualPlatformId = platformId || facebookId;\n    if (!actualPlatformId || !platformAccount) {";
  
  if (content.includes(oldValidation)) {
    content = content.replace(oldValidation, newValidation);
    console.log('  Fixed validation');
  }
  
  // 2. Fix INSERT parameters order
  console.log('\n2. Fixing INSERT parameters...');
  
  // Current broken: .run(id, facebookId, platformAccount, contactInfo...
  // Should be: .run(id, platform, platformId, facebookId, platformAccount, contactInfo...
  
  const oldRun = ".run(id, facebookId, platformAccount, contactInfo || null, status || 'ACTIVE', notes || null, now, now, currentUser.id);";
  const newRun = ".run(id, platform || 'FACEBOOK', actualPlatformId, actualPlatformId, platformAccount, contactInfo || null, status || 'ACTIVE', notes || null, now, now, currentUser.id);";
  
  if (content.includes(oldRun)) {
    content = content.replace(oldRun, newRun);
    console.log('  Fixed INSERT parameters');
  } else {
    console.log('  INSERT pattern not found, checking alternative...');
    
    // Try to find the .run line and fix it
    const runPattern = /\.run\(id,\s*facebookId,\s*platformAccount/;
    if (runPattern.test(content)) {
      content = content.replace(runPattern, ".run(id, platform || 'FACEBOOK', actualPlatformId, actualPlatformId, platformAccount");
      console.log('  Fixed with regex');
    }
  }
  
  // 3. Fix logOperation to use actualPlatformId
  console.log('\n3. Fixing logOperation...');
  const oldLog = "{ facebookId, platformAccount }";
  const newLog = "{ platform, platformId: actualPlatformId, platformAccount }";
  
  if (content.includes(oldLog)) {
    content = content.replace(oldLog, newLog);
    console.log('  Fixed logOperation');
  }
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n=== Done ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
