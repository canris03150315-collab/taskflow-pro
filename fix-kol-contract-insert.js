const fs = require('fs');

console.log('=== Fixing KOL Contract INSERT Statement ===\n');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

// The problematic INSERT has 15 ? but only 14 columns
const oldInsert = `INSERT INTO kol_contracts (
        id, kol_id, start_date, end_date, salary_amount, deposit_amount, 
        unpaid_amount, cleared_amount, total_paid, contract_type, notes, 
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// Fix: Remove the extra ? (should be 14, not 15)
const newInsert = `INSERT INTO kol_contracts (
        id, kol_id, start_date, end_date, salary_amount, deposit_amount, 
        unpaid_amount, cleared_amount, total_paid, contract_type, notes, 
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

if (content.includes(oldInsert)) {
  content = content.replace(oldInsert, newInsert);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed: Removed extra ? from INSERT statement');
  console.log('   - Was: 15 placeholders');
  console.log('   - Now: 14 placeholders (matches column count)');
} else {
  console.log('❌ Pattern not found. Checking variations...');
  
  // Try to find any INSERT with 15 ?
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('VALUES') && lines[i].includes('?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?')) {
      console.log(`Found 15-placeholder VALUES at line ${i + 1}:`);
      console.log(lines[i]);
    }
  }
}

console.log('\n=== Fix Complete ===');
