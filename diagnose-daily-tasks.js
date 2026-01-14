const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Diagnose Daily Tasks ===');

// 1. Check routine_templates
console.log('\n1. Daily routine templates:');
var templates = db.prepare("SELECT * FROM routine_templates WHERE is_daily = 1").all();
console.log('  Found:', templates.length);
templates.forEach(function(t) {
  console.log('  - ID:', t.id);
  console.log('    Dept:', t.department_id);
  console.log('    Name:', t.name);
  console.log('    Items:', t.items);
  console.log('');
});

// 2. Check routine_records for today
console.log('\n2. Today routine records:');
var today = new Date().toISOString().split('T')[0];
console.log('  Date:', today);
var records = db.prepare("SELECT * FROM routine_records WHERE date = ?").all(today);
console.log('  Found:', records.length);
records.forEach(function(r) {
  console.log('  - ID:', r.id);
  console.log('    User:', r.user_id);
  console.log('    Template:', r.template_id);
  console.log('    Items (raw):', r.items);
  if (r.items) {
    try {
      var parsed = JSON.parse(r.items);
      console.log('    Items (parsed):', JSON.stringify(parsed, null, 2));
    } catch(e) {
      console.log('    Parse error:', e.message);
    }
  }
  console.log('');
});

// 3. Check 86 department template specifically
console.log('\n3. Check x3ye5179b department template:');
var deptTemplates = db.prepare("SELECT * FROM routine_templates WHERE department_id = 'x3ye5179b' AND is_daily = 1").all();
deptTemplates.forEach(function(t) {
  console.log('  Template:', t.name);
  console.log('  Items:', t.items);
});

db.close();
console.log('\n=== Done ===');
