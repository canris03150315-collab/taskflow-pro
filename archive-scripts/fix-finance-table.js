const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fixing finance table - adding updated_at column ===\n');

try {
  // Check current schema
  console.log('Current schema:');
  const schema = db.prepare("PRAGMA table_info(finance)").all();
  console.log(JSON.stringify(schema, null, 2));
  
  // Check if updated_at exists
  const hasUpdatedAt = schema.some(col => col.name === 'updated_at');
  
  if (!hasUpdatedAt) {
    console.log('\n=== Adding updated_at column ===');
    db.exec('ALTER TABLE finance ADD COLUMN updated_at TEXT');
    console.log('Column added successfully!');
    
    // Verify
    console.log('\n=== Updated schema ===');
    const newSchema = db.prepare("PRAGMA table_info(finance)").all();
    console.log(JSON.stringify(newSchema, null, 2));
  } else {
    console.log('\nupdated_at column already exists!');
  }
} catch (error) {
  console.error('Error:', error);
}

db.close();
