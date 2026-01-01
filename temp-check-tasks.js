const db = require("/app/node_modules/better-sqlite3")("/app/data/taskflow.db");
const tasks = db.prepare("SELECT id, title, status, assigned_to_user_id, assigned_to_department FROM tasks").all();
console.log(JSON.stringify(tasks, null, 2));
db.close();
