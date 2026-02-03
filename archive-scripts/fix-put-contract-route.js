const fs = require('fs');

console.log('=== Fixing PUT /contracts/:id Route ===\n');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find and fix the UPDATE statement
// The problem: UPDATE doesn't include cleared_amount and total_paid
const oldUpdate = `UPDATE kol_contracts SET 
        start_date = ?, end_date = ?, salary_amount = ?, deposit_amount = ?, 
        unpaid_amount = ?, contract_type = ?, notes = ?, updated_at = ?
      WHERE id = ?`;

const newUpdate = `UPDATE kol_contracts SET 
        start_date = ?, end_date = ?, salary_amount = ?, deposit_amount = ?, 
        unpaid_amount = ?, cleared_amount = ?, total_paid = ?, contract_type = ?, notes = ?, updated_at = ?
      WHERE id = ?`;

if (content.includes(oldUpdate)) {
  content = content.replace(oldUpdate, newUpdate);
  
  // Also need to update the parameters array
  // Old: [startDate, endDate, salaryAmount, depositAmount, unpaidAmount, contractType, notes, now, id]
  // New: [startDate, endDate, salaryAmount, depositAmount, unpaidAmount, clearedAmount || 0, totalPaid || 0, contractType, notes, now, id]
  
  // Find the run() call and update parameters
  const oldParams = `startDate, endDate, salaryAmount, depositAmount, unpaidAmount, contractType, notes, now, id`;
  const newParams = `startDate, endDate, salaryAmount, depositAmount, unpaidAmount, clearedAmount || 0, totalPaid || 0, contractType, notes, now, id`;
  
  content = content.replace(oldParams, newParams);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed PUT route:');
  console.log('   - Added cleared_amount to UPDATE statement');
  console.log('   - Added total_paid to UPDATE statement');
  console.log('   - Updated parameters with default values (0)');
} else {
  console.log('❌ Pattern not found. Trying alternative approach...\n');
  
  // Alternative: Find the UPDATE statement more flexibly
  const updateMatch = content.match(/UPDATE kol_contracts SET[\s\S]{0,300}?WHERE id = \?/);
  if (updateMatch) {
    console.log('Found UPDATE statement:');
    console.log(updateMatch[0]);
    console.log('\nManual fix needed - UPDATE statement format is different than expected');
  }
}

console.log('\n=== Fix Complete ===');
