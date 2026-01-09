const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking forum/suggestions table ===\n');

try {
  // 檢查是否有 forum 或 suggestions 表
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name='forum' OR name='suggestions')").all();
  console.log('Found tables:', tables.map(t => t.name).join(', '));
  
  if (tables.length === 0) {
    console.log('\n❌ No forum or suggestions table found!');
  } else {
    tables.forEach(table => {
      console.log(`\n=== ${table.name} table schema ===`);
      const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
      schema.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''}`);
      });
      
      console.log(`\n=== ${table.name} sample data ===`);
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`Total records: ${count.count}`);
      
      if (count.count > 0) {
        const samples = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
        samples.forEach((s, i) => {
          console.log(`\n[${i + 1}]`, JSON.stringify(s, null, 2));
        });
      }
    });
  }
} catch (error) {
  console.error('Error:', error);
}

db.close();
