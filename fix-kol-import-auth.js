const fs = require('fs');

console.log('Adding authenticateToken import to KOL routes...');

try {
  const kolRoutesPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolRoutesPath, 'utf8');
  
  // Check if authenticateToken is already imported
  if (content.includes("require('../middleware/auth')") || content.includes('authenticateToken')) {
    console.log('⚠️  authenticateToken import already exists or is being used');
  }
  
  // Find the router require statement
  const routerPattern = /const router = express\.Router\(\);/;
  
  if (!routerPattern.test(content)) {
    console.error('❌ Could not find router declaration');
    process.exit(1);
  }
  
  // Add authenticateToken import after router declaration
  const authImport = "const { authenticateToken } = require('../middleware/auth');";
  
  content = content.replace(
    routerPattern,
    `const router = express.Router();\n${authImport}`
  );
  
  fs.writeFileSync(kolRoutesPath, content, 'utf8');
  console.log('✅ authenticateToken import added successfully');
  
} catch (error) {
  console.error('❌ Error adding import:', error);
  process.exit(1);
}
