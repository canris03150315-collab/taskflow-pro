const Database = require('better-sqlite3');

console.log('=== Check Auto-Create Routine Mechanism ===\n');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

// Check if there are daily templates
console.log('Test 1: Check daily templates');
const dailyTemplates = db.prepare('SELECT * FROM routine_templates WHERE is_daily = 1').all();
console.log('Daily templates count:', dailyTemplates.length);

if (dailyTemplates.length > 0) {
  console.log('\nDaily templates:');
  dailyTemplates.forEach(t => {
    console.log(`- ${t.title} (Dept: ${t.department_id})`);
    console.log(`  Items: ${t.items}`);
  });
}

// Check when was the last time each user created a routine
console.log('\nTest 2: Last routine record by user');
const lastRecordByUser = db.prepare(`
  SELECT user_id, MAX(date) as last_date, COUNT(*) as total_records
  FROM routine_records
  GROUP BY user_id
  ORDER BY last_date DESC
`).all();

console.log('Users and their last routine date:');
lastRecordByUser.forEach(r => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
  console.log(`- ${user?.name || r.user_id}: ${r.last_date} (${r.total_records} total records)`);
});

// Check if there's a cron job or scheduled task
console.log('\nTest 3: Check for auto-creation logic in code');
const fs = require('fs');

// Check routines.js for auto-creation
const routinesPath = '/app/dist/routes/routines.js';
const routinesContent = fs.readFileSync(routinesPath, 'utf8');

const hasAutoCreate = routinesContent.includes('is_daily') && routinesContent.includes('INSERT INTO routine_records');
console.log('Has auto-create logic in routines.js:', hasAutoCreate);

// Check if /today route creates records automatically
const hasTodayRoute = routinesContent.includes("router.get('/today'");
console.log('Has /today route:', hasTodayRoute);

if (hasTodayRoute) {
  console.log('\nThe /today route should auto-create records when accessed.');
  console.log('This means users need to VISIT the routine page to create today\'s record.');
}

db.close();
console.log('\n=== Check Complete ===');
