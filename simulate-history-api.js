const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Simulate /routines/history API response ===\n');

const today = new Date().toISOString().split('T')[0];
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const startDate = thirtyDaysAgo.toISOString().split('T')[0];

// Simulate what API returns
const records = db.prepare('SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC').all(startDate);

console.log('Total records:', records.length);

const mappedRecords = records.map(r => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
  return {
    id: r.id,
    user_id: r.user_id,
    user_name: user?.name,
    department_id: r.department_id,
    date: r.date,
    items: JSON.parse(r.completed_items || '[]')
  };
});

console.log('\nMapped records (what API returns):');
mappedRecords.forEach(r => {
  console.log(`\n- ${r.user_name} (${r.date})`);
  console.log('  items:', JSON.stringify(r.items));
  if (r.items.length > 0) {
    console.log('  First item has text:', r.items[0].text !== undefined);
    console.log('  First item has completed:', r.items[0].completed !== undefined);
  }
});

db.close();
