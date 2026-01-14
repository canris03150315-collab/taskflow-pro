const fs = require('fs');

console.log('Fixing KOL routes registration in server.js...');

try {
  const serverPath = '/app/dist/server.js';
  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Remove the incorrect KOL routes registration
  content = content.replace(/this\.app\.use\('\/api\/kol', kol_1\.default\);/g, '');
  content = content.replace(/const kol_1 = require\("\.\/routes\/kol"\);/g, '');
  
  // Find the finance routes registration
  const financeUsePattern = /this\.app\.use\('\/api\/finance', finance_1\.financeRoutes\);/;
  
  if (!financeUsePattern.test(content)) {
    console.error('❌ Could not find finance routes registration');
    process.exit(1);
  }
  
  // Add correct KOL routes import
  const financeImportPattern = /const finance_1 = require\("\.\/routes\/finance"\);/;
  const kolImport = 'const kolRoutes = require("./routes/kol");';
  content = content.replace(financeImportPattern, `$&\n        ${kolImport}`);
  
  // Add correct KOL routes registration
  const kolUse = "this.app.use('/api/kol', kolRoutes);";
  content = content.replace(financeUsePattern, `$&\n        ${kolUse}`);
  
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('✅ KOL routes registration fixed in server.js');
  
} catch (error) {
  console.error('❌ Error fixing KOL routes:', error);
  process.exit(1);
}
