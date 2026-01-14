const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Fix Daily Tasks Data ===');

var today = new Date().toISOString().split('T')[0];
console.log('Today:', today);

// Get all records that need fixing
var records = db.prepare("SELECT * FROM routine_records WHERE date = ?").all(today);

records.forEach(function(r) {
  console.log('\nChecking record:', r.id);
  
  var template = db.prepare("SELECT items FROM routine_templates WHERE id = ?").get(r.template_id);
  if (!template) {
    console.log('  Template not found, skipping');
    return;
  }
  
  var templateItems = JSON.parse(template.items || '[]');
  var currentItems = [];
  
  try {
    currentItems = JSON.parse(r.completed_items || '[]');
  } catch(e) {
    console.log('  Parse error, will recreate');
  }
  
  // Check if items have correct format
  var needsFix = false;
  currentItems.forEach(function(item, i) {
    if (typeof item === 'boolean' || !item.text) {
      needsFix = true;
    }
  });
  
  if (needsFix || currentItems.length !== templateItems.length) {
    console.log('  Fixing record...');
    
    // Rebuild items with correct format
    var fixedItems = templateItems.map(function(text, i) {
      var completed = false;
      if (currentItems[i]) {
        if (typeof currentItems[i] === 'boolean') {
          completed = currentItems[i];
        } else if (currentItems[i].completed !== undefined) {
          completed = currentItems[i].completed;
        }
      }
      return { text: text, completed: completed };
    });
    
    db.prepare("UPDATE routine_records SET completed_items = ? WHERE id = ?")
      .run(JSON.stringify(fixedItems), r.id);
    
    console.log('  Fixed with:', JSON.stringify(fixedItems));
  } else {
    console.log('  OK');
  }
});

console.log('\n=== Verification ===');
records = db.prepare("SELECT id, completed_items FROM routine_records WHERE date = ?").all(today);
records.forEach(function(r) {
  console.log('Record:', r.id);
  console.log('  Items:', r.completed_items);
});

db.close();
console.log('\n=== Done ===');
