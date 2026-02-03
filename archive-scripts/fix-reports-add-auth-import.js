const fs = require('fs');

console.log('=== Fixing reports.js - Adding authenticateToken import ===\n');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already imported
if (content.includes('authenticateToken')) {
  console.log('authenticateToken already imported or defined');
  
  // Check if it's imported from middleware
  if (content.includes("require('../middleware/auth')") || content.includes('require("../middleware/auth")')) {
    console.log('Already correctly imported from middleware, nothing to do');
    process.exit(0);
  }
}

// Find the position after other requires (look for express require)
const expressRequire = content.indexOf("require('express')");
if (expressRequire === -1) {
  console.log('ERROR: Could not find express require');
  process.exit(1);
}

// Find the end of that line
const lineEnd = content.indexOf('\n', expressRequire);
if (lineEnd === -1) {
  console.log('ERROR: Could not find line end');
  process.exit(1);
}

// Add authenticateToken import after express import
const authImport = "\nconst { authenticateToken } = require('../middleware/auth');";

const before = content.substring(0, lineEnd + 1);
const after = content.substring(lineEnd + 1);
const newContent = before + authImport + after;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('SUCCESS: Added authenticateToken import to reports.js');
console.log('Import added: const { authenticateToken } = require(\'../middleware/auth\');');
