const fs = require('fs');

console.log('Registering KOL routes in server.js...');

try {
  const serverPath = '/app/dist/server.js';
  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Check if KOL routes are already registered
  if (content.includes("app.use('/api/kol'")) {
    console.log('⚠️  KOL routes already registered');
    process.exit(0);
  }
  
  // Find the finance routes import
  const financeImportPattern = /const finance_1 = require\("\.\/routes\/finance"\);/;
  
  if (!financeImportPattern.test(content)) {
    console.error('❌ Could not find finance routes import');
    process.exit(1);
  }
  
  // Add KOL routes import after finance
  const kolImport = 'const kol_1 = require("./routes/kol");';
  content = content.replace(financeImportPattern, `$&\n        ${kolImport}`);
  
  // Find the finance routes registration
  const financeUsePattern = /this\.app\.use\('\/api\/finance', finance_1\.financeRoutes\);/;
  
  if (!financeUsePattern.test(content)) {
    console.error('❌ Could not find finance routes registration');
    process.exit(1);
  }
  
  // Add KOL routes registration after finance
  const kolUse = "this.app.use('/api/kol', kol_1.default);";
  content = content.replace(financeUsePattern, `$&\n        ${kolUse}`);
  
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('✅ KOL routes registered successfully in server.js');
  
} catch (error) {
  console.error('❌ Error registering KOL routes:', error);
  process.exit(1);
}
