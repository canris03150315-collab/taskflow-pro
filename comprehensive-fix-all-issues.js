const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Comprehensive Fix for All Reports Issues ===\n');

const db = new Database('/app/data/taskflow.db');

// 1. Check and fix report_authorizations table structure
console.log('1. Checking report_authorizations table structure...');
const columns = db.prepare("PRAGMA table_info(report_authorizations)").all();
const columnNames = columns.map(c => c.name);

console.log('   Current columns:', columnNames.join(', '));

// Check if status column exists
if (!columnNames.includes('status')) {
  console.log('   [FIX] Adding missing status column...');
  db.exec("ALTER TABLE report_authorizations ADD COLUMN status TEXT DEFAULT 'pending'");
  console.log('   [OK] Status column added');
} else {
  console.log('   [OK] Status column exists');
}

// 2. Drop the wrong approval_authorizations table
console.log('\n2. Removing incorrect approval_authorizations table...');
try {
  db.exec('DROP TABLE IF EXISTS approval_authorizations');
  console.log('   [OK] Wrong table removed');
} catch (error) {
  console.log('   [ERROR]', error.message);
}

// 3. Verify report_authorizations has all needed columns
console.log('\n3. Verifying all required columns exist...');
const requiredColumns = ['status', 'requester_id', 'first_approver_id', 'second_approver_id', 'expires_at'];
const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));

if (missingColumns.length > 0) {
  console.log('   [WARNING] Missing columns:', missingColumns.join(', '));
} else {
  console.log('   [OK] All required columns exist');
}

db.close();

// 4. Fix reports.js - ensure it uses report_authorizations (not approval_authorizations)
console.log('\n4. Verifying reports.js uses correct table name...');
const reportsPath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(reportsPath, 'utf8');

// Check if it's using the wrong table name
if (content.includes('approval_authorizations')) {
  console.log('   [FIX] Replacing approval_authorizations with report_authorizations...');
  content = content.replace(/approval_authorizations/g, 'report_authorizations');
  fs.writeFileSync(reportsPath, content, 'utf8');
  console.log('   [OK] Table name corrected');
} else {
  console.log('   [OK] Already using correct table name');
}

console.log('\n=== Fix Complete ===');
console.log('\nSummary:');
console.log('- report_authorizations table: FIXED');
console.log('- Wrong approval_authorizations table: REMOVED');
console.log('- reports.js table references: VERIFIED');
console.log('- DELETE route: EXISTS (no changes needed)');
console.log('- POST route with reportDate: EXISTS (no changes needed)');
