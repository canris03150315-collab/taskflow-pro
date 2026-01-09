const db = require("better-sqlite3")("/app/data/taskflow.db");

const rows = db.prepare("SELECT * FROM routine_templates").all();
console.log("資料筆數:", rows.length);
rows.forEach(r => {
  console.log("ID:", r.id);
  console.log("  title:", r.title);
  console.log("  department_id:", r.department_id);
  console.log("  is_daily:", r.is_daily);
  console.log("---");
});

db.close();
