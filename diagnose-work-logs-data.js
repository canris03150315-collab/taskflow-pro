const fs = require('fs');

console.log('=== Diagnosing work-logs.js ===');

// 1. Check if work_logs table exists
console.log('\n1. Checking work_logs table structure...');
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

try {
  const tableInfo = db.prepare("PRAGMA table_info(work_logs)").all();
  console.log('Table columns:', JSON.stringify(tableInfo, null, 2));
  
  const count = db.prepare("SELECT COUNT(*) as count FROM work_logs").get();
  console.log('Total records:', count.count);
  
  if (count.count > 0) {
    const sample = db.prepare("SELECT * FROM work_logs LIMIT 1").get();
    console.log('Sample record:', JSON.stringify(sample, null, 2));
  }
} catch (error) {
  console.error('Database error:', error.message);
}

// 2. Check work-logs.js file content
console.log('\n2. Checking work-logs.js route file...');
const routePath = '/app/dist/routes/work-logs.js';

if (fs.existsSync(routePath)) {
  const content = fs.readFileSync(routePath, 'utf8');
  
  // Check for db.prepare usage
  const prepareMatches = content.match(/db\.prepare\([^)]+\)/g);
  if (prepareMatches) {
    console.log('Found db.prepare calls:', prepareMatches.length);
    console.log('First few:', prepareMatches.slice(0, 3));
  } else {
    console.log('No db.prepare calls found');
  }
  
  // Check for await db.all/get usage
  const asyncMatches = content.match(/await db\.(all|get|run)\(/g);
  if (asyncMatches) {
    console.log('Found async db calls:', asyncMatches.length);
  } else {
    console.log('No async db calls found');
  }
  
  // Check line 46 specifically
  const lines = content.split('\n');
  console.log('\nLine 46:', lines[45]);
  console.log('Line 47:', lines[46]);
  console.log('Line 48:', lines[47]);
} else {
  console.log('work-logs.js not found!');
}

console.log('\nDONE');
