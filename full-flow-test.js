const Database = require('./node_modules/better-sqlite3');
const fs = require('fs');

console.log('=== Full Flow Test ===\n');

const db = new Database('/app/data/taskflow.db');

// 1. Check Se7en's record
const se7en = db.prepare('SELECT * FROM users WHERE username = ?').get('code001');
const today = new Date().toISOString().split('T')[0];

console.log('1. Se7en info:');
console.log('   ID:', se7en.id);
console.log('   Name:', se7en.name);

// 2. Check today's record
const record = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?').get(se7en.id, today);

console.log('\n2. Today record:');
if (record) {
  console.log('   ID:', record.id);
  console.log('   completed_items:', record.completed_items);
  const items = JSON.parse(record.completed_items);
  console.log('   Parsed items:', items);
  console.log('   First item text:', items[0]?.text);
  console.log('   First item completed:', items[0]?.completed);
}

// 3. Simulate API response
console.log('\n3. Simulated API response for this record:');
const apiRecord = {
  id: record.id,
  user_id: record.user_id,
  department_id: record.department_id,
  date: record.date,
  items: JSON.parse(record.completed_items || '[]')
};
console.log(JSON.stringify(apiRecord, null, 2));

// 4. Simulate frontend getUserRoutineStats
console.log('\n4. Simulated getUserRoutineStats:');
const routineRecords = [apiRecord];
const userRecord = routineRecords.find(r => r.user_id === se7en.id);
console.log('   Found record:', !!userRecord);
if (userRecord && userRecord.items) {
  const total = userRecord.items.length;
  const completed = userRecord.items.filter(item => item.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  console.log('   Total:', total);
  console.log('   Completed:', completed);
  console.log('   Percentage:', percentage + '%');
}

// 5. Check history route code
console.log('\n5. History route check:');
const routinesContent = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');
const hasHistory = routinesContent.includes("router.get('/history'");
console.log('   Has /history route:', hasHistory);

db.close();
console.log('\n=== Done ===');
