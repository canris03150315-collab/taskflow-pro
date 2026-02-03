const fs = require('fs');

console.log('Fixing work-logs.js to use auth middleware...');

const routePath = '/app/dist/routes/work-logs.js';
let content = fs.readFileSync(routePath, 'utf8');

// Remove the custom authenticateToken function
content = content.replace(/function authenticateToken\(req, res, next\) \{[\s\S]*?\n\}/g, '');

// Remove the custom logOperation function if it exists
content = content.replace(/function logOperation\([\s\S]*?\n\}/g, '');

// Add the correct imports at the top
const newImports = `const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
`;

// Replace the existing imports
content = content.replace(/const express = require\('express'\);[\s\S]*?const router = express\.Router\(\);/g, newImports);

// Write back
fs.writeFileSync(routePath, content, 'utf8');

console.log('SUCCESS: work-logs.js now uses auth middleware');
console.log('DONE');
