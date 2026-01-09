const fs = require("fs");
const authFile = "/app/dist/routes/auth.js";
let content = fs.readFileSync(authFile, "utf8");

const setupCheckRoute = `
// GET /api/auth/setup/check - 檢查系統是否需要初始化
router.get('/setup/check', async (req, res) => {
  try {
    const db = req.db;
    const result = await db.get('SELECT COUNT(*) as count FROM users');
    res.json({
      needsSetup: result.count === 0,
      userCount: result.count
    });
  } catch (error) {
    console.error('Setup check error:', error);
    res.status(500).json({ error: error.message });
  }
});
`;

// Find "exports.authRoutes = router;" or similar export statement
const exportPatterns = [
  'exports.authRoutes = router',
  'module.exports = router',
  'exports.default = router'
];

let inserted = false;
for (const pattern of exportPatterns) {
  const exportIndex = content.indexOf(pattern);
  if (exportIndex !== -1) {
    // Insert before the export
    content = content.substring(0, exportIndex) + setupCheckRoute + "\n" + content.substring(exportIndex);
    inserted = true;
    console.log(`Setup check route added before: ${pattern}`);
    break;
  }
}

if (!inserted) {
  // If no export found, append to the end
  content = content + "\n" + setupCheckRoute;
  console.log("Setup check route appended to end");
}

fs.writeFileSync(authFile, content);
console.log("File updated successfully");
