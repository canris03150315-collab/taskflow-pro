const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Diagnose Daily Tasks v2 ===');

// 1. Check routine_records table structure
console.log('\n1. routine_records table structure:');
var cols = db.prepare("PRAGMA table_info(routine_records)").all();
cols.forEach(function(c) {
  console.log('  - ' + c.name + ': ' + c.type);
});

// 2. Check raw record data
console.log('\n2. Raw routine_records data:');
var records = db.prepare("SELECT * FROM routine_records LIMIT 3").all();
records.forEach(function(r) {
  console.log('  Record:', JSON.stringify(r, null, 2));
});

// 3. Check if completed_items has data
console.log('\n3. Check completed_items column:');
var today = new Date().toISOString().split('T')[0];
var todayRecords = db.prepare("SELECT id, user_id, completed_items, items FROM routine_records WHERE date = ?").all(today);
todayRecords.forEach(function(r) {
  console.log('  - ID:', r.id);
  console.log('    completed_items:', r.completed_items);
  console.log('    items:', r.items);
});

db.close();
console.log('\n=== Done ===');
