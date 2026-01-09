const db = require("better-sqlite3")("/app/data/taskflow.db");
const user = db.prepare("SELECT id, name, username, role, permissions FROM users WHERE id = ?").get("user-1767024824151-vbceaduza");
console.log("User:", user.name);
console.log("Permissions raw:", user.permissions);
if (user.permissions) {
  try {
    const parsed = JSON.parse(user.permissions);
    console.log("Permissions parsed:", parsed);
    console.log("Permissions length:", parsed.length);
  } catch (e) {
    console.log("Parse error:", e.message);
  }
} else {
  console.log("No permissions field");
}
db.close();
