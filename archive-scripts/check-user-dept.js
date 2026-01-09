const db = require("better-sqlite3")("/app/data/taskflow.db");

// 查看用戶
const users = db.prepare("SELECT id, name, department FROM users").all();
console.log("用戶列表:");
users.forEach(u => console.log("  -", u.name, "| dept:", u.department));

console.log("");

// 查看部門
const depts = db.prepare("SELECT id, name FROM departments").all();
console.log("部門列表:");
depts.forEach(d => console.log("  -", d.name, "| id:", d.id));

console.log("");

// 查看每日任務
const dailyTasks = db.prepare("SELECT id, title, department_id, is_daily FROM routine_templates WHERE is_daily = 1").all();
console.log("每日任務:");
dailyTasks.forEach(t => console.log("  -", t.title, "| dept_id:", t.department_id));

db.close();
