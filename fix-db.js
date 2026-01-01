const Database = require("better-sqlite3");
const db = new Database("/app/data/taskflow.db");

try {
  // 檢查表是否存在
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='routine_templates'").get();
  
  if (tableCheck) {
    console.log("routine_templates 表已存在");
    // 檢查 is_daily 欄位是否存在
    const columns = db.prepare("PRAGMA table_info(routine_templates)").all();
    const hasIsDaily = columns.some(c => c.name === "is_daily");
    
    if (!hasIsDaily) {
      db.exec("ALTER TABLE routine_templates ADD COLUMN is_daily INTEGER DEFAULT 0");
      console.log("✓ 已添加 is_daily 欄位");
    } else {
      console.log("✓ is_daily 欄位已存在");
    }
    
    // 顯示表結構
    console.log("欄位:", columns.map(c => c.name).join(", "));
  } else {
    // 創建表
    db.exec("CREATE TABLE routine_templates (id TEXT PRIMARY KEY, department_id TEXT NOT NULL, title TEXT NOT NULL, items TEXT DEFAULT '[]', last_updated TEXT, read_by TEXT DEFAULT '[]', is_daily INTEGER DEFAULT 0)");
    console.log("✓ 已創建 routine_templates 表");
  }
  
  // 創建 routine_records 表
  db.exec("CREATE TABLE IF NOT EXISTS routine_records (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, user_id TEXT NOT NULL, date TEXT NOT NULL, items TEXT DEFAULT '[]', completed_at TEXT)");
  console.log("✓ routine_records 表已就緒");
  
} catch (e) {
  console.error("錯誤:", e.message);
}

db.close();
console.log("完成");
