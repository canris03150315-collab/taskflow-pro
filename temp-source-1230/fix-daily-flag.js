const db = require("better-sqlite3")("/app/data/taskflow.db");

// 把所有 daily- 開頭的記錄設為 is_daily = 1
const result = db.prepare("UPDATE routine_templates SET is_daily = 1 WHERE id LIKE 'daily-%'").run();
console.log("已更新", result.changes, "筆記錄");

// 驗證
const rows = db.prepare("SELECT id, title, is_daily FROM routine_templates").all();
rows.forEach(r => console.log(r.id, "| is_daily:", r.is_daily));

db.close();
