const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking INCOME records ===\n');

try {
  const records = db.prepare("SELECT id, type, amount, description, department_id, user_id, recorded_by, date, status FROM finance WHERE type = 'INCOME' ORDER BY created_at DESC LIMIT 10").all();
  
  console.log('Total INCOME records:', records.length);
  console.log('\nRecords:');
  records.forEach((r, index) => {
    console.log(`\n[${index + 1}] ID: ${r.id}`);
    console.log(`    Amount: ${r.amount}`);
    console.log(`    Description: ${r.description}`);
    console.log(`    Department: ${r.department_id}`);
    console.log(`    User ID: ${r.user_id}`);
    console.log(`    Recorded By: ${r.recorded_by}`);
    console.log(`    Date: ${r.date}`);
    console.log(`    Status: ${r.status}`);
    
    // 檢查金額是否接近 10000
    if (r.amount >= 9990 && r.amount <= 10010) {
      const diff = 10000 - r.amount;
      if (diff !== 0) {
        console.log(`    ⚠️  WARNING: Amount differs from 10000 by ${diff}`);
      }
    }
  });
  
  // 檢查是否有任何計算邏輯
  console.log('\n=== Checking for calculation patterns ===');
  const allRecords = db.prepare("SELECT amount FROM finance WHERE type = 'INCOME'").all();
  const amounts = allRecords.map(r => r.amount);
  console.log('All INCOME amounts:', amounts);
  
  // 檢查是否有扣除模式
  const possibleDeductions = amounts.filter(a => a % 1 !== 0 || (a < 10000 && a > 9900));
  if (possibleDeductions.length > 0) {
    console.log('\n⚠️  Found amounts that might have deductions:');
    possibleDeductions.forEach(a => {
      console.log(`   ${a} (difference from 10000: ${10000 - a})`);
    });
  }
  
} catch (error) {
  console.error('Error:', error);
}

db.close();
