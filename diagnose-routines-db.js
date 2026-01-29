const Database = require('better-sqlite3');
const path = require('path');

console.log('=== Routines Database Diagnosis ===\n');

const dbPath = '/app/data/taskflow.db';
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Test 1: Check if routine_records table exists
  console.log('\nTest 1: Check if routine_records table exists');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='routine_records'").all();
  console.log('Table exists:', tables.length > 0);
  
  if (tables.length === 0) {
    console.log('ERROR: routine_records table does not exist!');
    
    // Check all tables
    const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Available tables:', allTables.map(t => t.name).join(', '));
  } else {
    // Test 2: Check table structure
    console.log('\nTest 2: Check table structure');
    const schema = db.prepare("PRAGMA table_info(routine_records)").all();
    console.log('Columns:', schema.map(c => `${c.name} (${c.type})`).join(', '));
    
    // Test 3: Count total records
    console.log('\nTest 3: Count total records');
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM routine_records').get();
    console.log('Total records:', totalCount.count);
    
    // Test 4: Check today's records
    console.log('\nTest 4: Check today\'s records');
    const todayRecords = db.prepare('SELECT * FROM routine_records WHERE date = date("now", "localtime") LIMIT 5').all();
    console.log('Today records count:', todayRecords.length);
    if (todayRecords.length > 0) {
      console.log('Sample:', JSON.stringify(todayRecords[0], null, 2));
    }
    
    // Test 5: Check recent records
    console.log('\nTest 5: Check recent records (last 5)');
    const recentRecords = db.prepare('SELECT user_id, date, COUNT(*) as task_count FROM routine_records GROUP BY user_id, date ORDER BY date DESC LIMIT 5').all();
    console.log('Recent records:', JSON.stringify(recentRecords, null, 2));
    
    // Test 6: Check if routines.js has history route
    console.log('\nTest 6: Check routines.js for history route');
    const fs = require('fs');
    const routinesPath = '/app/dist/routes/routines.js';
    if (fs.existsSync(routinesPath)) {
      const content = fs.readFileSync(routinesPath, 'utf8');
      const hasHistoryRoute = content.includes('router.get(\'/history\'') || content.includes('router.get("/history"');
      console.log('Has /history route:', hasHistoryRoute);
      
      if (!hasHistoryRoute) {
        console.log('ERROR: /history route not found in routines.js!');
        
        // Check what routes exist
        const getRoutes = content.match(/router\.get\(['"](.*?)['"]/g);
        console.log('Available GET routes:', getRoutes ? getRoutes.join(', ') : 'none');
      }
    } else {
      console.log('ERROR: routines.js not found!');
    }
  }
  
  db.close();
  console.log('\n=== Diagnosis Complete ===');
  
} catch (error) {
  console.log('ERROR:', error.message);
  console.log('Stack:', error.stack);
}
