const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Fix db is not defined error ===');

// Find the /today route and add const db = req.db;
const oldPattern = /router\.get\('\/today', authenticateToken, async \(req, res\) => \{\s*try \{\s*const currentUser = req\.user;/;

const replacement = `router.get('/today', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Added const db = req.db; to /today route');
} else {
  console.log('ERROR: Could not find pattern to fix');
}
