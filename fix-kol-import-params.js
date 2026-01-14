const fs = require('fs');

console.log('=== Fix KOL Import - Contract Params ===');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // Fix: contracts INSERT in import-excel has 15 columns but only 14 params
  // Need to add department_id param
  
  console.log('\n1. Fixing contract INSERT params in import-excel...');
  
  // Find the contract INSERT run() that's missing department_id
  const oldContractRun = "row.contractType || 'NORMAL', row.contractNotes || null, now, now, currentUser.id);";
  const newContractRun = "row.contractType || 'NORMAL', row.contractNotes || null, now, now, currentUser.id, row.departmentId || currentUser.department);";
  
  // Count occurrences
  const matches = (content.match(new RegExp(oldContractRun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log(`  Found ${matches} occurrences to fix`);
  
  if (matches > 0) {
    content = content.replace(new RegExp(oldContractRun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newContractRun);
    console.log('  Fixed contract INSERT params');
  }
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n=== Done ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
