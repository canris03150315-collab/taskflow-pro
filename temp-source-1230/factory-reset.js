const db = require("better-sqlite3")("/app/data/taskflow.db");

console.log("=== 完全重置系統到初始設定狀態 ===");

// 獲取所有表
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

// 清空所有表
tables.forEach(t => {
  try {
    db.exec(`DELETE FROM ${t.name}`);
    console.log(`✓ 已清空 ${t.name}`);
  } catch (e) {
    console.log(`- ${t.name}: ${e.message}`);
  }
});

// 刪除系統設定中的 initialized 標記，讓系統重新進入初始設定
try {
  db.exec("DELETE FROM system_settings WHERE key = 'initialized'");
  db.exec("DELETE FROM system_settings WHERE key = 'setup_completed'");
  console.log("✓ 已移除初始化標記");
} catch (e) {
  console.log("- 系統設定:", e.message);
}

db.close();
console.log("=== 完全重置完成 ===");
console.log("系統將顯示初始設定畫面");
