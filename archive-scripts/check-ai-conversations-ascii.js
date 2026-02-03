const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// Check if table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_conversations'").all();
console.log('ai_conversations table exists:', tables.length > 0);

if (tables.length > 0) {
  // Check table structure
  const tableInfo = db.prepare("PRAGMA table_info(ai_conversations)").all();
  console.log('\nTable structure:');
  tableInfo.forEach(col => {
    console.log('  - ' + col.name + ' (' + col.type + ')');
  });
  
  // Check record count
  const count = db.prepare("SELECT COUNT(*) as count FROM ai_conversations").get();
  console.log('\nTotal records:', count.count);
  
  // Show recent 5 records
  if (count.count > 0) {
    const recent = db.prepare("SELECT * FROM ai_conversations ORDER BY created_at DESC LIMIT 5").all();
    console.log('\nRecent 5 records:');
    recent.forEach(record => {
      console.log('  - [' + record.role + '] ' + record.message.substring(0, 50) + '... (' + record.created_at + ')');
    });
  }
} else {
  console.log('\nERROR: ai_conversations table does not exist! Need to create it.');
}

db.close();
