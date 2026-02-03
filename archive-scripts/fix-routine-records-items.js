const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fixing routine records with empty items ===\n');

const today = new Date().toISOString().split('T')[0];

// Get all today's records with empty or null items
const emptyRecords = db.prepare(`
  SELECT * FROM routine_records 
  WHERE date = ? AND (items IS NULL OR items = '' OR items = '[]')
`).all(today);

console.log(`Found ${emptyRecords.length} records with empty items today`);

if (emptyRecords.length === 0) {
  console.log('No records to fix');
  db.close();
  process.exit(0);
}

// Fix each record
let fixed = 0;
for (const record of emptyRecords) {
  // Get the template for this department
  const template = db.prepare(`
    SELECT * FROM routine_templates 
    WHERE department_id = ? AND is_daily = 1
  `).get(record.department_id);
  
  if (!template) {
    console.log(`⚠️  No template found for dept ${record.department_id}`);
    continue;
  }
  
  // Get user name
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(record.user_id);
  
  // Parse template items
  let templateItems;
  try {
    templateItems = JSON.parse(template.items);
  } catch (e) {
    console.log(`⚠️  Invalid template items JSON for dept ${record.department_id}`);
    continue;
  }
  
  // Create record items from template
  const recordItems = templateItems.map(item => ({
    id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: item.title || item,
    completed: false
  }));
  
  // Update the record
  const updateStmt = db.prepare(`
    UPDATE routine_records 
    SET items = ?, total_count = ?, completed_count = 0
    WHERE id = ?
  `);
  
  updateStmt.run(
    JSON.stringify(recordItems),
    recordItems.length,
    record.id
  );
  
  console.log(`✅ Fixed: ${user?.name} - ${recordItems.length} items`);
  fixed++;
}

console.log(`\n✅ Fixed ${fixed} records`);
db.close();
