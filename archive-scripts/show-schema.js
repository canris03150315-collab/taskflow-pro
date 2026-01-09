const db = require("better-sqlite3")("/app/data/taskflow.db");
const cols = db.prepare("PRAGMA table_info(routine_templates)").all();
console.log("欄位列表:");
cols.forEach(c => console.log("  -", c.name, "(" + c.type + ")"));
db.close();
