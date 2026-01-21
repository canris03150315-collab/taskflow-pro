const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// 查詢最新的合約
const contract = db.prepare(`
  SELECT * FROM kol_contracts 
  ORDER BY created_at DESC 
  LIMIT 1
`).get();

console.log('=== Latest Contract ===');
console.log('ID:', contract.id);
console.log('Salary Amount:', contract.salary_amount);
console.log('Deposit Amount:', contract.deposit_amount);
console.log('Unpaid Amount:', contract.unpaid_amount);
console.log('Cleared Amount:', contract.cleared_amount);
console.log('Total Paid:', contract.total_paid);

console.log('\n=== Expected Logic ===');
console.log('Unpaid Amount should be:', contract.salary_amount);
console.log('After payment of $90:');
console.log('  - Cleared Amount should be:', 90);
console.log('  - Remaining (未結) should be:', contract.salary_amount - 90);

db.close();
