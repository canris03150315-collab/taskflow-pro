const fs = require("fs");
const authFile = "/app/dist/routes/auth.js";
let content = fs.readFileSync(authFile, "utf8");

const setupCheckRoute = `

// GET /api/auth/setup/check
router.get("/setup/check", async (req, res) => {
  try {
    const db = req.db;
    const result = await db.get("SELECT COUNT(*) as count FROM users");
    res.json({
      needsSetup: result.count === 0,
      userCount: result.count
    });
  } catch (error) {
    console.error("Setup check error:", error);
    res.status(500).json({ error: error.message });
  }
});
`;

// Find the last occurrence of "module.exports" and insert before it
const exportIndex = content.lastIndexOf("module.exports");
if (exportIndex !== -1) {
  content = content.substring(0, exportIndex) + setupCheckRoute + "\n" + content.substring(exportIndex);
  fs.writeFileSync(authFile, content);
  console.log("Setup check route added successfully");
} else {
  console.error("Could not find module.exports");
  process.exit(1);
}
