const db = require("better-sqlite3")("/app/data/taskflow.db");

// 檢查 routine_records 表
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='routine_records'").get();

if (tableExists) {
  console.log("routine_records 表已存在");
  const columns = db.prepare("PRAGMA table_info(routine_records)").all();
  console.log("現有欄位:", columns.map(c => c.name).join(", "));
  
  // 檢查並添加缺少的欄位
  const hasItems = columns.some(c => c.name === "items");
  const hasCompletedAt = columns.some(c => c.name === "completed_at");
  
  if (!hasItems) {
    db.exec("ALTER TABLE routine_records ADD COLUMN items TEXT DEFAULT '[]'");
    console.log("✓ 已添加 items 欄位");
  }
  if (!hasCompletedAt) {
    db.exec("ALTER TABLE routine_records ADD COLUMN completed_at TEXT");
    console.log("✓ 已添加 completed_at 欄位");
  }
} else {
  console.log("建立 routine_records 表...");
  db.exec("CREATE TABLE routine_records (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, user_id TEXT NOT NULL, date TEXT NOT NULL, items TEXT DEFAULT '[]', completed_at TEXT)");
  console.log("✓ 已建立 routine_records 表");
}

// 驗證
const cols = db.prepare("PRAGMA table_info(routine_records)").all();
console.log("最終欄位:", cols.map(c => c.name).join(", "));

db.close();
console.log("完成");
