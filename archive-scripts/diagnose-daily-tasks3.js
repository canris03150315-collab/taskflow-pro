const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Diagnose Daily Tasks v3 ===');

var today = new Date().toISOString().split('T')[0];
console.log('Today:', today);

// Check today's records
console.log('\n1. Today routine_records:');
var todayRecords = db.prepare("SELECT * FROM routine_records WHERE date = ?").all(today);
console.log('  Found:', todayRecords.length);
todayRecords.forEach(function(r) {
  console.log('  - ID:', r.id);
  console.log('    User:', r.user_id);
  console.log('    completed_items:', r.completed_items);
});

// Check if records have empty completed_items
console.log('\n2. Records with empty completed_items:');
var emptyRecords = db.prepare("SELECT * FROM routine_records WHERE completed_items IS NULL OR completed_items = ''").all();
console.log('  Found:', emptyRecords.length);

// Fix: Update empty records with template items
console.log('\n3. Fixing empty records...');
emptyRecords.forEach(function(r) {
  var template = db.prepare("SELECT items FROM routine_templates WHERE id = ?").get(r.template_id);
  if (template && template.items) {
    var items = JSON.parse(template.items).map(function(text) {
      return { text: text, completed: false };
    });
    db.prepare("UPDATE routine_records SET completed_items = ? WHERE id = ?").run(JSON.stringify(items), r.id);
    console.log('  Fixed:', r.id, 'with', items.length, 'items');
  }
});

// Verify fix
console.log('\n4. Verify today records after fix:');
todayRecords = db.prepare("SELECT id, completed_items FROM routine_records WHERE date = ?").all(today);
todayRecords.forEach(function(r) {
  console.log('  - ID:', r.id);
  console.log('    completed_items:', r.completed_items ? r.completed_items.substring(0, 100) + '...' : 'NULL');
});

db.close();
console.log('\n=== Done ===');
