const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Adding weekly_notes column to kol_contracts table...');

try {
  // Check if column already exists
  const tableInfo = db.prepare('PRAGMA table_info(kol_contracts)').all();
  const hasWeeklyNotes = tableInfo.some(col => col.name === 'weekly_notes');
  
  if (hasWeeklyNotes) {
    console.log('Column weekly_notes already exists');
  } else {
    // Add weekly_notes column
    db.prepare('ALTER TABLE kol_contracts ADD COLUMN weekly_notes TEXT').run();
    console.log('SUCCESS: Added weekly_notes column');
  }
  
  // Verify
  const updatedInfo = db.prepare('PRAGMA table_info(kol_contracts)').all();
  console.log('\nUpdated table structure:');
  updatedInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}

db.close();
console.log('\nDone!');
