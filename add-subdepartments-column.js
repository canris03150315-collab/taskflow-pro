const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Adding parent_department_id column to departments table ===');

try {
  db.exec("ALTER TABLE departments ADD COLUMN parent_department_id TEXT DEFAULT NULL");
  console.log('Column added successfully');
  
  console.log('\n=== Updated Schema ===');
  const schema = db.prepare("PRAGMA table_info(departments)").all();
  console.log(JSON.stringify(schema, null, 2));
  
  console.log('\nSUCCESS');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('Column already exists, skipping...');
    console.log('SUCCESS');
  } else {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

db.close();
