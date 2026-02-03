const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Routines Diagnosis (Fixed) ===\n');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

// Test 1: Check total records
console.log('Test 1: Total records');
const total = db.prepare('SELECT COUNT(*) as count FROM routine_records').get();
console.log('Total records:', total.count);

// Test 2: Check today's records (fixed SQL)
console.log('\nTest 2: Today\'s records');
const today = new Date().toISOString().split('T')[0];
console.log('Today date:', today);
const todayRecords = db.prepare('SELECT * FROM routine_records WHERE date = ? LIMIT 5').all(today);
console.log('Today records count:', todayRecords.length);
if (todayRecords.length > 0) {
  console.log('Sample:', JSON.stringify(todayRecords[0], null, 2));
}

// Test 3: Check recent records by user
console.log('\nTest 3: Recent records by user');
const recentByUser = db.prepare(`
  SELECT user_id, date, COUNT(*) as task_count 
  FROM routine_records 
  GROUP BY user_id, date 
  ORDER BY date DESC 
  LIMIT 10
`).all();
console.log('Recent by user:', JSON.stringify(recentByUser, null, 2));

// Test 4: Check routines.js for /history route
console.log('\nTest 4: Check routines.js for /history route');
const routinesPath = '/app/dist/routes/routines.js';
if (fs.existsSync(routinesPath)) {
  const content = fs.readFileSync(routinesPath, 'utf8');
  
  // Check for history route
  const hasHistoryRoute = content.includes('router.get(\'/history\'') || 
                          content.includes('router.get("/history"') ||
                          content.includes("router.get('/history'") ||
                          content.includes('router.get(`/history`');
  
  console.log('Has /history route:', hasHistoryRoute);
  
  if (!hasHistoryRoute) {
    console.log('ERROR: /history route NOT FOUND!');
    
    // Find all GET routes
    const getRoutes = content.match(/router\.get\(['"\/`].*?['"\/`]/g);
    console.log('Available GET routes:', getRoutes ? getRoutes.slice(0, 10).join(', ') : 'none');
  } else {
    console.log('SUCCESS: /history route exists');
    
    // Find the route definition
    const historyRouteMatch = content.match(/router\.get\(['"\/`]\/history['"\/`][\s\S]{0,500}/);
    if (historyRouteMatch) {
      console.log('Route preview:', historyRouteMatch[0].substring(0, 200));
    }
  }
} else {
  console.log('ERROR: routines.js not found at', routinesPath);
}

// Test 5: Check server.js to see if routines routes are registered
console.log('\nTest 5: Check if routines routes are registered in server');
const serverPath = '/app/dist/server.js';
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  const hasRoutinesRoute = serverContent.includes('routines') || serverContent.includes('routine');
  console.log('Server has routines routes:', hasRoutinesRoute);
  
  // Find the registration
  const routinesMatch = serverContent.match(/app\.use\(['"\/].*?routines.*?\)/g);
  if (routinesMatch) {
    console.log('Routines registration:', routinesMatch.join(', '));
  }
}

db.close();
console.log('\n=== Diagnosis Complete ===');
