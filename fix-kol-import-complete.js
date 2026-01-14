const fs = require('fs');

console.log('=== Fix KOL Import Excel - Complete Fix ===');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // Find the import-excel route and rewrite the validation logic
  console.log('\n1. Finding import-excel route...');
  
  // Replace the validation check to be more lenient
  const oldValidation = "if (!row.facebookId || !row.platformAccount) {";
  const newValidation = "if (!row.facebookId && !row.platformAccount) {";
  
  if (content.includes(oldValidation)) {
    content = content.replace(oldValidation, newValidation);
    console.log('  Fixed validation (now accepts either facebookId OR platformAccount)');
  }
  
  // Also add fallback logic: if no platformAccount, use facebookId
  const oldError = "results.errors.push({ row: i + 1, error: 'Missing required fields' });";
  const newError = `results.errors.push({ row: i + 1, error: 'Missing required fields (臉書ID or 平台帳號)' });`;
  
  if (content.includes(oldError)) {
    content = content.replace(oldError, newError);
    console.log('  Improved error message');
  }
  
  // Add fallback for platformAccount
  console.log('\n2. Adding fallback for platformAccount...');
  
  const oldProfileRun = "kolId, row.facebookId, row.platformAccount, row.contactInfo || null";
  const newProfileRun = "kolId, row.facebookId || row.platformAccount, row.platformAccount || row.facebookId, row.contactInfo || null";
  
  if (content.includes(oldProfileRun)) {
    content = content.replace(oldProfileRun, newProfileRun);
    console.log('  Added fallback for facebookId/platformAccount');
  }
  
  // Fix the existing profile update to also handle the fallback
  const oldExistingCheck = "WHERE facebook_id = ? AND platform_account = ?').get(row.facebookId, row.platformAccount)";
  const newExistingCheck = "WHERE facebook_id = ? OR platform_account = ?').get(row.facebookId || row.platformAccount, row.platformAccount || row.facebookId)";
  
  if (content.includes(oldExistingCheck)) {
    content = content.replace(oldExistingCheck, newExistingCheck);
    console.log('  Fixed existing profile check');
  }
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n=== Done ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
