const Database = require('better-sqlite3');
const fs = require('fs');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

try {
  console.log('Adding images column to announcements table...');
  
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(announcements)").all();
  const hasImagesColumn = tableInfo.some(col => col.name === 'images');
  
  if (hasImagesColumn) {
    console.log('images column already exists, skipping');
  } else {
    // Add images column (JSON format, stores Base64 image array)
    db.exec("ALTER TABLE announcements ADD COLUMN images TEXT DEFAULT '[]'");
    console.log('SUCCESS: Added images column');
  }
  
  // Verify
  const updatedTableInfo = db.prepare("PRAGMA table_info(announcements)").all();
  console.log('\nCurrent announcements table structure:');
  updatedTableInfo.forEach(col => {
    console.log('  - ' + col.name + ': ' + col.type);
  });
  
  console.log('\nSUCCESS: Database modification complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
} finally {
  db.close();
}
