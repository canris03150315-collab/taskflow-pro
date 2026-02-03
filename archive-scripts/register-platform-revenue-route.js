const fs = require('fs');
const path = require('path');

const indexPath = '/app/dist/index.js';
let content = fs.readFileSync(indexPath, 'utf8');

const routeImport = "const platformRevenueRoutes = require('./routes/platform-revenue');";
const routeUse = "app.use('/api/platform-revenue', platformRevenueRoutes);";

if (content.includes('platform-revenue')) {
  console.log('Platform revenue route already registered');
  process.exit(0);
}

const lastRouteImportMatch = content.match(/const \w+Routes = require\('\.\/routes\/\w+'\);/g);
if (lastRouteImportMatch) {
  const lastImport = lastRouteImportMatch[lastRouteImportMatch.length - 1];
  const importIndex = content.lastIndexOf(lastImport);
  content = content.slice(0, importIndex + lastImport.length) + '\n' + routeImport + content.slice(importIndex + lastImport.length);
}

const lastRouteUseMatch = content.match(/app\.use\('\/api\/\w+',\s*\w+Routes\);/g);
if (lastRouteUseMatch) {
  const lastUse = lastRouteUseMatch[lastRouteUseMatch.length - 1];
  const useIndex = content.lastIndexOf(lastUse);
  content = content.slice(0, useIndex + lastUse.length) + '\n' + routeUse + content.slice(useIndex + lastUse.length);
}

fs.writeFileSync(indexPath, content, 'utf8');
console.log('Platform revenue route registered successfully');
