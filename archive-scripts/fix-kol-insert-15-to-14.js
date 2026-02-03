const fs = require('fs');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

// 修復 POST /contracts 的 INSERT 語句：15 個 ? 改為 14 個 ?
// 欄位：id, kol_id, start_date, end_date, salary_amount, deposit_amount, 
//       unpaid_amount, cleared_amount, total_paid, contract_type, notes, 
//       created_at, updated_at, created_by (共 14 個)
content = content.replace(
  /VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)/g,
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed KOL contract INSERT statement (15 -> 14 placeholders)');
