const http = require('http');

console.log('=== Test /api/routines/today endpoint ===');

// Simulate authenticated request
const testUserId = 'user-1767451212149-7rxqt4f6d'; // Se7en
const testDept = 'cbsv402gc';

// Create a mock JWT token payload
const mockUser = {
  id: testUserId,
  username: 'code001',
  name: 'Se7en',
  department: testDept,
  role: 'EMPLOYEE'
};

console.log('Testing with user:', mockUser);

// We need to check what the actual route returns
// Let's read the route file to see the exact logic

const fs = require('fs');
const routeContent = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// Find the /today route
const todayRouteMatch = routeContent.match(/router\.get\('\/today'[\s\S]*?\n\}\);/);

if (todayRouteMatch) {
  console.log('\n--- Found /today route ---');
  console.log(todayRouteMatch[0].substring(0, 500) + '...');
} else {
  console.log('ERROR: Could not find /today route');
}

// Now let's actually test the database query
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const today = new Date().toISOString().split('T')[0];

console.log('\n--- Database query test ---');
console.log('Query params:', { userId: testUserId, today, dept: testDept });

let existing = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?')
  .get(testUserId, today, testDept);

console.log('\nExisting record found:', !!existing);

if (existing) {
  console.log('Record ID:', existing.id);
  console.log('Template ID:', existing.template_id);
  console.log('completed_items:', existing.completed_items);
  console.log('completed_items type:', typeof existing.completed_items);
  
  if (existing.completed_items) {
    try {
      const parsed = JSON.parse(existing.completed_items);
      console.log('Parsed items:', JSON.stringify(parsed, null, 2));
      console.log('Items count:', parsed.length);
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  } else {
    console.log('completed_items is null or undefined');
  }
  
  // Simulate what the API should return
  console.log('\n--- Simulated API response ---');
  const apiResponse = {
    id: existing.id,
    userId: existing.user_id,
    templateId: existing.template_id,
    date: existing.date,
    items: JSON.parse(existing.completed_items || '[]'),
    completedAt: existing.completed_at
  };
  console.log(JSON.stringify(apiResponse, null, 2));
}

db.close();
console.log('\n=== Test complete ===');
