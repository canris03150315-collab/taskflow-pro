const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Recreating routine records from template ===\n');

const today = new Date().toISOString().split('T')[0];

// Get all today's records
const todayRecords = db.prepare('SELECT * FROM routine_records WHERE date = ?').all(today);
console.log(`Total today records: ${todayRecords.length}`);

// Delete all today's records (we'll recreate them from template)
db.prepare('DELETE FROM routine_records WHERE date = ?').run(today);
console.log('Deleted all today records');

// Get the 86 dept template
const template = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1').get('x3ye5179b');

if (!template) {
  console.log('No template found for dept 86');
  db.close();
  process.exit(0);
}

console.log(`Template: ${template.title}`);

// Parse template items
let templateItems;
try {
  templateItems = JSON.parse(template.items);
  console.log(`Template has ${templateItems.length} items`);
} catch (e) {
  // Items might be a simple array of strings
  templateItems = template.items;
  console.log('Template items (raw):', template.items);
}

// Get all dept 86 users
const dept86Users = db.prepare('SELECT id, name FROM users WHERE department = ?').all('x3ye5179b');
console.log(`Creating records for ${dept86Users.length} users`);

// Create record for each user
dept86Users.forEach(user => {
  const recordId = `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Insert new record - using only columns that exist
  db.prepare(`
    INSERT INTO routine_records (id, user_id, department_id, template_id, date, completed_count, total_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    recordId,
    user.id,
    'x3ye5179b',
    template.id,
    today,
    0,
    templateItems.length
  );
  
  console.log(`✅ Created record for ${user.name}`);
});

console.log('\n✅ All records recreated');
db.close();
