const db = require("better-sqlite3")("/app/data/taskflow.db");

console.log("=== 開始初始化資料庫 ===");

// 清空所有資料表
const tables = [
  "routine_templates",
  "routine_records", 
  "tasks",
  "announcements",
  "reports",
  "finance_records",
  "forum_posts",
  "forum_comments",
  "chat_messages",
  "chat_channels",
  "attendance_records",
  "system_logs",
  "sync_queue"
];

tables.forEach(table => {
  try {
    db.exec(`DELETE FROM ${table}`);
    console.log(`✓ 已清空 ${table}`);
  } catch (e) {
    console.log(`- ${table} 不存在或已清空`);
  }
});

// 保留部門和用戶（只保留預設）
try {
  // 刪除非預設用戶
  db.exec("DELETE FROM users WHERE id != 'admin-1766339617209'");
  console.log("✓ 已清理用戶（保留預設管理員）");
} catch (e) {
  console.log("- 用戶清理失敗:", e.message);
}

// 重置系統設定
try {
  db.exec("DELETE FROM system_settings");
  db.exec("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('company_name', '我的公司')");
  db.exec("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('initialized', 'true')");
  console.log("✓ 已重置系統設定");
} catch (e) {
  console.log("- 系統設定重置:", e.message);
}

db.close();
console.log("=== 初始化完成 ===");
