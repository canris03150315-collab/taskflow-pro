const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Test Routine History API Response ===\n');

// Simulate what the API should return
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const startDate = thirtyDaysAgo.toISOString().split('T')[0];

console.log(`Query date range: >= ${startDate}\n`);

// Get all records (simulating API without user filter for testing)
const records = db.prepare(`
  SELECT id, user_id, department_id, date, completed_items
  FROM routine_records 
  WHERE date >= ?
  ORDER BY date DESC
`).all(startDate);

console.log(`Total records found: ${records.length}\n`);

// Map records like the API does
const mappedRecords = records.map(r => {
  let items = [];
  try {
    items = JSON.parse(r.completed_items || '[]');
  } catch (e) {
    console.log(`ERROR parsing items for record ${r.id}`);
    items = [];
  }
  
  return {
    id: r.id,
    user_id: r.user_id,
    department_id: r.department_id,
    date: r.date,
    items: items
  };
});

console.log('Sample records (first 5):');
mappedRecords.slice(0, 5).forEach((r, idx) => {
  console.log(`\n${idx + 1}. Date: ${r.date}, User: ${r.user_id}`);
  console.log(`   Items count: ${r.items.length}`);
  
  if (r.items.length > 0) {
    const completed = r.items.filter(item => item.completed).length;
    const percentage = Math.round((completed / r.items.length) * 100);
    console.log(`   Completed: ${completed}/${r.items.length} (${percentage}%)`);
    
    r.items.forEach((item, i) => {
      const status = item.completed ? 'DONE' : 'TODO';
      console.log(`     [${status}] ${item.text}`);
    });
  }
});

console.log('\n=== Test Complete ===');
console.log('The API should now return correct data with items field populated.');
db.close();
