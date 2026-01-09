const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnosing Amount Issue ===\n');

try {
  // 檢查所有收入記錄
  const incomeRecords = db.prepare("SELECT id, amount, description, date, created_at FROM finance WHERE type = 'INCOME' ORDER BY created_at DESC").all();
  
  console.log('Total INCOME records:', incomeRecords.length);
  console.log('\nAnalyzing amounts:');
  
  incomeRecords.forEach((r, index) => {
    console.log(`\n[${index + 1}] Created: ${r.created_at}`);
    console.log(`    Amount: ${r.amount}`);
    console.log(`    Description: "${r.description}"`);
    console.log(`    Date: ${r.date}`);
    
    // 檢查是否有模式
    if (r.amount < 10000 && r.amount > 9990) {
      const diff = 10000 - r.amount;
      console.log(`    ⚠️  Difference from 10000: ${diff}`);
      
      // 檢查是否與描述有關
      const descNum = parseInt(r.description);
      if (!isNaN(descNum)) {
        console.log(`    Description as number: ${descNum}`);
        if (descNum === diff) {
          console.log(`    🔴 PATTERN FOUND: Description matches the deduction!`);
        }
      }
    }
  });
  
  // 檢查是否有計算公式
  console.log('\n=== Checking for calculation pattern ===');
  const pattern1 = incomeRecords.filter(r => {
    const descNum = parseInt(r.description);
    return !isNaN(descNum) && (10000 - r.amount) === descNum * 2;
  });
  
  if (pattern1.length > 0) {
    console.log('🔴 FOUND PATTERN: Amount = 10000 - (description * 2)');
    pattern1.forEach(r => {
      console.log(`   Record: ${r.id}, Amount: ${r.amount}, Desc: "${r.description}"`);
    });
  }
  
  const pattern2 = incomeRecords.filter(r => {
    const descNum = parseInt(r.description);
    return !isNaN(descNum) && (10000 - r.amount) === descNum;
  });
  
  if (pattern2.length > 0) {
    console.log('🔴 FOUND PATTERN: Amount = 10000 - description');
    pattern2.forEach(r => {
      console.log(`   Record: ${r.id}, Amount: ${r.amount}, Desc: "${r.description}"`);
    });
  }
  
} catch (error) {
  console.error('Error:', error);
}

db.close();
