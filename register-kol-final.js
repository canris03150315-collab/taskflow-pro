const fs = require('fs');

console.log('Registering KOL routes in server.js...');

try {
  const serverPath = '/app/dist/server.js';
  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Check if already registered
  if (content.includes("app.use('/api/kol'") || content.includes('kol')) {
    console.log('⚠️  Removing old KOL routes registration...');
    content = content.replace(/const kolRoutes = require\("\.\/routes\/kol"\);?\n?/g, '');
    content = content.replace(/const kol_1 = require\("\.\/routes\/kol"\);?\n?/g, '');
    content = content.replace(/this\.app\.use\('\/api\/kol'.*?\);?\n?/g, '');
  }
  
  // Find the memos routes line
  const memosPattern = /this\.app\.use\('\/api\/memos', memos_1\.memoRoutes\);/;
  
  if (!memosPattern.test(content)) {
    console.error('❌ Could not find memos routes registration point');
    process.exit(1);
  }
  
  // Add KOL routes after memos
  const kolUse = "        const kolRoutes = require('./routes/kol');\n        this.app.use('/api/kol', kolRoutes);";
  content = content.replace(memosPattern, `$&\n${kolUse}`);
  
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('✅ KOL routes registered successfully in server.js');
  
} catch (error) {
  console.error('❌ Error registering KOL routes:', error);
  process.exit(1);
}
