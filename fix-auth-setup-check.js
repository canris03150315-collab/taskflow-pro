const fs = require('fs');

console.log('=== Fixing auth.js setup/check route ===\n');

const authPath = '/app/dist/routes/auth.js';

try {
  let content = fs.readFileSync(authPath, 'utf8');
  
  // Find and replace the incorrect async db.get pattern
  const oldPattern = /router\.get\('\/setup\/check',\s*async\s*\(req,\s*res\)\s*=>\s*\{[^}]*const\s+db\s*=\s*req\.db;[^}]*const\s+result\s*=\s*await\s+db\.get\([^)]+\);[^}]*res\.json\(\{[^}]*needsSetup:[^}]*userCount:[^}]*\}\);[^}]*\}\s*catch[^}]*\{[^}]*console\.error[^}]*res\.status\(500\)\.json[^}]*\}\s*\}\);/s;
  
  const newCode = `router.get('/setup/check', (req, res) => {
  try {
    const db = req.db;
    const result = db.db.prepare('SELECT COUNT(*) as count FROM users').get();
    res.json({
      needsSetup: result.count === 0,
      userCount: result.count
    });
  } catch (error) {
    console.error('Setup check error:', error);
    res.status(500).json({ error: error.message });
  }
});`;

  if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newCode);
    fs.writeFileSync(authPath, content, 'utf8');
    console.log('SUCCESS: Fixed /setup/check route');
    console.log('Changed from: await db.get()');
    console.log('Changed to: db.db.prepare().get()');
  } else {
    console.log('WARNING: Pattern not found, trying alternative fix...');
    
    // Alternative: find the route and replace just the problematic line
    if (content.includes("const result = await db.get('SELECT COUNT(*) as count FROM users')")) {
      content = content.replace(
        "const result = await db.get('SELECT COUNT(*) as count FROM users')",
        "const result = db.db.prepare('SELECT COUNT(*) as count FROM users').get()"
      );
      
      // Also remove async from the function
      content = content.replace(
        "router.get('/setup/check', async (req, res) =>",
        "router.get('/setup/check', (req, res) =>"
      );
      
      fs.writeFileSync(authPath, content, 'utf8');
      console.log('SUCCESS: Fixed using alternative method');
    } else {
      console.log('ERROR: Could not find the problematic code');
      process.exit(1);
    }
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
