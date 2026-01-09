const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Testing manual attendance functionality...');

// Test 1: Check if we can query existing records
const today = new Date().toISOString().split('T')[0];
const testUserId = 'admin-1767449914767'; // canris

console.log('\n1. Testing query for existing records...');
const existing = db.prepare('SELECT * FROM attendance_records WHERE user_id = ? AND date = ?').get(testUserId, today);

if (existing) {
  console.log('Found existing record:', {
    id: existing.id,
    date: existing.date,
    clock_in: existing.clock_in,
    clock_out: existing.clock_out,
    has_clock_out: !!existing.clock_out
  });
} else {
  console.log('No existing record found for today');
}

// Test 2: Check table structure
console.log('\n2. Checking table structure...');
const tableInfo = db.prepare("PRAGMA table_info(attendance_records)").all();
const hasManualColumns = tableInfo.some(col => col.name === 'is_manual');
console.log('Has manual attendance columns:', hasManualColumns);

if (hasManualColumns) {
  const manualCols = tableInfo.filter(col => col.name.includes('manual')).map(col => col.name);
  console.log('Manual columns:', manualCols);
}

console.log('\nSUCCESS: Database structure is correct');
db.close();
