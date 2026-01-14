const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnose Routine History Records ===\n');

// 1. Check table structure
console.log('1. Table Structure:');
const tableInfo = db.prepare("PRAGMA table_info(routine_records)").all();
console.log('Columns:', tableInfo.map(c => c.name).join(', '));
console.log('');

// 2. Total record count
const totalCount = db.prepare("SELECT COUNT(*) as count FROM routine_records").get();
console.log(`2. Total Records: ${totalCount.count}`);
console.log('');

// 3. Recent 7 days records
console.log('3. Recent 7 Days Records:');
const recentRecords = db.prepare(`
  SELECT date, COUNT(*) as count, 
         GROUP_CONCAT(DISTINCT user_id) as user_ids
  FROM routine_records 
  WHERE date >= date('now', '-7 days')
  GROUP BY date 
  ORDER BY date DESC
`).all();

recentRecords.forEach(r => {
  console.log(`  Date: ${r.date}, Count: ${r.count}, Users: ${r.user_ids ? r.user_ids.split(',').length : 0}`);
});
console.log('');

// 4. Check records from 2 days ago
const twoDaysAgo = new Date();
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

const oneDayAgo = new Date();
oneDayAgo.setDate(oneDayAgo.getDate() - 1);
const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0];

console.log(`4. Check completion records from past 2 days (${twoDaysAgoStr} and ${oneDayAgoStr}):`);

[twoDaysAgoStr, oneDayAgoStr].forEach(dateStr => {
  const records = db.prepare(`
    SELECT id, user_id, date, items
    FROM routine_records 
    WHERE date = ?
  `).all(dateStr);
  
  console.log(`\n  === ${dateStr} ===`);
  console.log(`  Record Count: ${records.length}`);
  
  records.forEach(r => {
    let items = [];
    try {
      items = JSON.parse(r.items);
    } catch (e) {
      console.log(`  WARNING: User ${r.user_id}: Cannot parse items`);
      return;
    }
    
    const completed = items.filter(item => item.completed).length;
    const total = items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    console.log(`  User ${r.user_id}: ${completed}/${total} (${percentage}%)`);
    
    // Show task details
    if (items.length > 0) {
      items.forEach((item, idx) => {
        const status = item.completed ? 'DONE' : 'TODO';
        console.log(`    [${status}] ${item.text || '(no text)'}`);
      });
    }
  });
});

console.log('\n');

// 5. Check today's records
const today = new Date().toISOString().split('T')[0];
console.log(`5. Today's Records (${today}):`);
const todayRecords = db.prepare(`
  SELECT id, user_id, date, items
  FROM routine_records 
  WHERE date = ?
`).all(today);

console.log(`  Record Count: ${todayRecords.length}`);
todayRecords.forEach(r => {
  let items = [];
  try {
    items = JSON.parse(r.items);
  } catch (e) {
    console.log(`  WARNING: User ${r.user_id}: Cannot parse items`);
    return;
  }
  
  const completed = items.filter(item => item.completed).length;
  const total = items.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  console.log(`  User ${r.user_id}: ${completed}/${total} (${percentage}%)`);
});

console.log('\n');

// 6. Check what API would return
console.log('6. Simulate API /routines/history response:');
const apiRecords = db.prepare(`
  SELECT id, user_id, department_id, date, items
  FROM routine_records 
  ORDER BY date DESC 
  LIMIT 30
`).all();

console.log(`  Total Records Returned: ${apiRecords.length}`);
console.log('  Date Distribution:');
const dateGroups = {};
apiRecords.forEach(r => {
  if (!dateGroups[r.date]) {
    dateGroups[r.date] = 0;
  }
  dateGroups[r.date]++;
});

Object.keys(dateGroups).sort().reverse().forEach(date => {
  console.log(`    ${date}: ${dateGroups[date]} records`);
});

console.log('\n=== Diagnosis Complete ===');
db.close();
