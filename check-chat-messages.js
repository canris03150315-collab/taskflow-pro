const db = require("better-sqlite3")("/app/data/taskflow.db");

console.log("=== 檢查聊天訊息 ===\n");

// 查詢最近的訊息
const msgs = db.prepare(`
  SELECT m.id, m.user_id, u.name as user_name, u.role, m.content, m.created_at 
  FROM chat_messages m 
  LEFT JOIN users u ON m.user_id = u.id 
  ORDER BY m.created_at DESC 
  LIMIT 10
`).all();

console.log("最近10條訊息:");
msgs.forEach((m, i) => {
  console.log(`${i+1}. User: ${m.user_name} (${m.role})`);
  console.log(`   ID: ${m.user_id}`);
  console.log(`   Content: ${m.content.substring(0, 50)}`);
  console.log(`   Time: ${m.created_at}\n`);
});

// 查詢所有用戶
console.log("\n=== 所有用戶 ===");
const users = db.prepare("SELECT id, name, role FROM users").all();
users.forEach(u => {
  console.log(`${u.name} (${u.role}) - ID: ${u.id}`);
});

db.close();
