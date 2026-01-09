const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Finance table schema ===\n');

try {
  const schema = db.prepare("PRAGMA table_info(finance)").all();
  console.log('Columns:');
  schema.forEach(col => {
    console.log(`- ${col.name} (${col.type})`);
  });
  
  const missingColumns = [];
  const requiredColumns = ['scope', 'owner_id', 'recorded_by', 'attachment'];
  
  requiredColumns.forEach(colName => {
    if (!schema.find(col => col.name === colName)) {
      missingColumns.push(colName);
    }
  });
  
  if (missingColumns.length > 0) {
    console.log('\n=== Missing columns ===');
    console.log(missingColumns.join(', '));
    
    console.log('\n=== Adding missing columns ===');
    missingColumns.forEach(colName => {
      db.exec(`ALTER TABLE finance ADD COLUMN ${colName} TEXT`);
      console.log(`Added: ${colName}`);
    });
    
    console.log('\n=== Updated schema ===');
    const newSchema = db.prepare("PRAGMA table_info(finance)").all();
    newSchema.forEach(col => {
      console.log(`- ${col.name} (${col.type})`);
    });
  } else {
    console.log('\nAll required columns exist!');
  }
} catch (error) {
  console.error('Error:', error);
}

db.close();
