const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fix record format ===');

const today = new Date().toISOString().split('T')[0];

// Get all today's records
const records = db.prepare('SELECT * FROM routine_records WHERE date = ?').all(today);

console.log(`Found ${records.length} records for today\n`);

records.forEach(r => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
  console.log(`User: ${user?.name}`);
  console.log(`Record ID: ${r.id}`);
  console.log(`Current completed_items: ${r.completed_items}`);
  
  try {
    const items = JSON.parse(r.completed_items || '[]');
    
    // Check if format is wrong (array of booleans instead of objects)
    if (items.length > 0 && typeof items[0] !== 'object') {
      console.log('  ❌ Wrong format detected!');
      
      // Get template to reconstruct correct format
      const template = db.prepare('SELECT * FROM routine_templates WHERE id = ?').get(r.template_id);
      if (template) {
        const templateItems = JSON.parse(template.items || '[]');
        const correctItems = templateItems.map((text, index) => ({
          text,
          completed: items[index] === true
        }));
        
        console.log(`  ✅ Fixing to: ${JSON.stringify(correctItems)}`);
        
        db.prepare('UPDATE routine_records SET completed_items = ? WHERE id = ?')
          .run(JSON.stringify(correctItems), r.id);
      }
    } else if (items.length > 0 && items[0].text) {
      console.log('  ✅ Format is correct');
    } else {
      console.log('  ⚠️ Empty or unknown format');
    }
  } catch (e) {
    console.log(`  ❌ Parse error: ${e.message}`);
  }
  
  console.log('');
});

console.log('=== Fix complete ===');
db.close();
