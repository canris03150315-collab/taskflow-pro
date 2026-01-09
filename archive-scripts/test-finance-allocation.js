const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Testing Finance Allocation Logic ===\n');

try {
  // 模擬撥款 10000 元
  const testAmount = 10000;
  console.log('Original Amount:', testAmount);
  console.log('Type:', typeof testAmount);
  
  // 檢查是否有任何計算或轉換
  const id = `finance-test-${Date.now()}`;
  const now = new Date().toISOString();
  
  db.prepare(
    'INSERT INTO finance (id, type, amount, description, category, user_id, department_id, date, status, created_at, updated_at, scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    'INCOME',
    testAmount,
    'Test allocation',
    '測試',
    'admin-1767325980478',
    'Engineering',
    '2026-01-03',
    'PENDING',
    now,
    now,
    'DEPARTMENT'
  );
  
  // 讀取剛插入的記錄
  const record = db.prepare('SELECT * FROM finance WHERE id = ?').get(id);
  console.log('\nInserted Record:');
  console.log('ID:', record.id);
  console.log('Amount:', record.amount, '(type:', typeof record.amount + ')');
  console.log('Expected:', testAmount);
  console.log('Match:', record.amount === testAmount);
  
  // 清理測試記錄
  db.prepare('DELETE FROM finance WHERE id = ?').run(id);
  console.log('\nTest record cleaned up.');
  
  // 檢查現有記錄的金額是否有問題
  console.log('\n=== Checking existing records ===');
  const records = db.prepare('SELECT id, type, amount, description, department_id FROM finance WHERE type = "INCOME" ORDER BY created_at DESC LIMIT 5').all();
  records.forEach(r => {
    console.log(`\nID: ${r.id}`);
    console.log(`Amount: ${r.amount}`);
    console.log(`Description: ${r.description}`);
    console.log(`Department: ${r.department_id}`);
  });
  
} catch (error) {
  console.error('Error:', error);
}

db.close();
