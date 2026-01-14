const fs = require('fs');

console.log('=== Fix KOL API for Multi-Platform Support ===');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // 1. Fix POST /profiles - add platform and platform_id
  console.log('\n1. Fixing POST /profiles...');
  
  // Find INSERT statement and add platform, platform_id
  const oldInsert = "INSERT INTO kol_profiles (id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by)";
  const newInsert = "INSERT INTO kol_profiles (id, platform, platform_id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by)";
  
  if (content.includes(oldInsert)) {
    content = content.replace(oldInsert, newInsert);
    console.log('  Fixed INSERT statement');
  }
  
  // Find VALUES and add platform, platform_id placeholders
  const oldValues = "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const newValues = "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  
  if (content.includes(oldValues)) {
    content = content.replace(oldValues, newValues);
    console.log('  Fixed VALUES placeholders');
  }
  
  // Find the params array for INSERT
  // Original: [id, facebook_id, platform_account, contact_info, status, notes, now, now, created_by]
  // New: [id, platform, platform_id, facebook_id, platform_account, contact_info, status, notes, now, now, created_by]
  const oldParams = "[id, facebook_id, platform_account, contact_info, status, notes, now, now, created_by]";
  const newParams = "[id, platform || 'FACEBOOK', platform_id || facebook_id, facebook_id, platform_account, contact_info, status, notes, now, now, created_by]";
  
  if (content.includes(oldParams)) {
    content = content.replace(oldParams, newParams);
    console.log('  Fixed params array');
  }
  
  // 2. Fix destructuring to include platform and platform_id
  console.log('\n2. Fixing request body destructuring...');
  
  const oldDestructure = "const { facebook_id, platform_account, contact_info, status, notes } = req.body;";
  const newDestructure = "const { platform, platform_id, facebook_id, platform_account, contact_info, status, notes } = req.body;";
  
  if (content.includes(oldDestructure)) {
    content = content.replace(oldDestructure, newDestructure);
    console.log('  Fixed destructuring');
  }
  
  // Also handle camelCase version
  const oldDestructureCamel = "const { facebookId, platformAccount, contactInfo, status, notes } = req.body;";
  const newDestructureCamel = "const { platform, platformId, facebookId, platformAccount, contactInfo, status, notes } = req.body;";
  
  if (content.includes(oldDestructureCamel)) {
    content = content.replace(oldDestructureCamel, newDestructureCamel);
    console.log('  Fixed camelCase destructuring');
  }
  
  // 3. Fix SELECT to include platform and platform_id
  console.log('\n3. Fixing SELECT statements...');
  
  // Add platform, platform_id to SELECT if not already there
  if (!content.includes('platform,') && !content.includes('platform_id,')) {
    // Find SELECT * and replace with explicit columns including platform
    content = content.replace(
      /SELECT \* FROM kol_profiles/g,
      'SELECT id, platform, platform_id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by FROM kol_profiles'
    );
    console.log('  Fixed SELECT statements');
  }
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n=== Done ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
