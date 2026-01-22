const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fixing today routine records ===\n');

const today = new Date().toISOString().split('T')[0];
console.log(`Date: ${today}`);

// Get all today's records with NULL completed_items
const emptyRecords = db.prepare(`
  SELECT * FROM routine_records 
  WHERE date = ? AND completed_items IS NULL
`).all(today);

console.log(`Found ${emptyRecords.length} records with NULL completed_items`);

if (emptyRecords.length === 0) {
  console.log('No records to fix');
  db.close();
  process.exit(0);
}

// Fix each record
let fixed = 0;
for (const record of emptyRecords) {
  const template = db.prepare('SELECT * FROM routine_templates WHERE id = ?').get(record.template_id);
  
  if (!template) {
    console.log(`⚠️  No template found for record ${record.id}`);
    continue;
  }
  
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(record.user_id);
  
  // Parse template items
  let templateItems;
  try {
    templateItems = JSON.parse(template.items);
  } catch (e) {
    console.log(`⚠️  Invalid template items: ${template.items}`);
    continue;
  }
  
  // Create completed_items from template
  const completedItems = templateItems.map(item => ({
    text: item,
    completed: false
  }));
  
  // Update the record
  db.prepare(`
    UPDATE routine_records 
    SET completed_items = ?
    WHERE id = ?
  `).run(
    JSON.stringify(completedItems),
    record.id
  );
  
  console.log(`✅ Fixed: ${user?.name} - ${completedItems.length} items`);
  fixed++;
}

console.log(`\n✅ Fixed ${fixed} records`);
db.close();
