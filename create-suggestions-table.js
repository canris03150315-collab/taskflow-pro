const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Creating suggestions table ===\n');

try {
  // 創建 suggestions 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      author_id TEXT NOT NULL,
      target_dept_id TEXT,
      is_anonymous INTEGER DEFAULT 0,
      status TEXT DEFAULT 'OPEN',
      upvotes TEXT DEFAULT '[]',
      comments TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  
  console.log('✅ suggestions table created successfully!');
  
  // 驗證表結構
  console.log('\n=== Table schema ===');
  const schema = db.prepare("PRAGMA table_info(suggestions)").all();
  schema.forEach(col => {
    console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  
  // 檢查是否有數據
  const count = db.prepare('SELECT COUNT(*) as count FROM suggestions').get();
  console.log(`\nTotal records: ${count.count}`);
  
} catch (error) {
  console.error('Error:', error);
}

db.close();
