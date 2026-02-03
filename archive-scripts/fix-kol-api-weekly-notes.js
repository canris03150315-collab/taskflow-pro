const fs = require('fs');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing KOL API to support weekly_notes...');

// 1. Fix POST /contracts - Add weekly_notes to INSERT
const postInsertOld = /INSERT INTO kol_contracts \(([^)]+)\) VALUES \(([^)]+)\)/;
const postInsertMatch = content.match(postInsertOld);

if (postInsertMatch) {
  const columns = postInsertMatch[1];
  const placeholders = postInsertMatch[2];
  
  if (!columns.includes('weekly_notes')) {
    const newColumns = columns + ', weekly_notes';
    const newPlaceholders = placeholders + ', ?';
    content = content.replace(postInsertOld, `INSERT INTO kol_contracts (${newColumns}) VALUES (${newPlaceholders})`);
    console.log('✓ Updated POST INSERT statement');
  }
}

// 2. Fix POST /contracts - Add weekly_notes to parameters
// Find the line with .run(...) after INSERT
const runParamsPattern = /\.run\(\s*id,\s*kolId,\s*startDate,\s*endDate,\s*salaryAmount,\s*depositAmount,\s*unpaidAmount,\s*clearedAmount,\s*totalPaid,\s*contractType,\s*notes,\s*now,\s*now,\s*createdBy\s*\)/;
if (runParamsPattern.test(content)) {
  content = content.replace(
    runParamsPattern,
    '.run(id, kolId, startDate, endDate, salaryAmount, depositAmount, unpaidAmount, clearedAmount, totalPaid, contractType, notes, now, now, createdBy, weeklyNotes || \'\')'
  );
  console.log('✓ Updated POST run() parameters');
}

// 3. Fix POST /contracts - Extract weeklyNotes from request body
const bodyExtractPattern = /const \{ kolId, startDate, endDate, salaryAmount, depositAmount, unpaidAmount, clearedAmount, totalPaid, contractType, notes \} = req\.body;/;
if (bodyExtractPattern.test(content)) {
  content = content.replace(
    bodyExtractPattern,
    'const { kolId, startDate, endDate, salaryAmount, depositAmount, unpaidAmount, clearedAmount, totalPaid, contractType, notes, weeklyNotes } = req.body;'
  );
  console.log('✓ Updated POST body extraction');
}

// 4. Fix PUT /contracts - Add weekly_notes to UPDATE
const putUpdatePattern = /UPDATE kol_contracts SET start_date = \?, end_date = \?, salary_amount = \?, deposit_amount = \?,\s*unpaid_amount = \?, cleared_amount = \?, total_paid = \?, contract_type = \?,\s*notes = \?, updated_at = \? WHERE id = \?/;
if (putUpdatePattern.test(content)) {
  content = content.replace(
    putUpdatePattern,
    'UPDATE kol_contracts SET start_date = ?, end_date = ?, salary_amount = ?, deposit_amount = ?, unpaid_amount = ?, cleared_amount = ?, total_paid = ?, contract_type = ?, notes = ?, weekly_notes = ?, updated_at = ? WHERE id = ?'
  );
  console.log('✓ Updated PUT UPDATE statement');
}

// 5. Fix PUT /contracts - Update run() parameters
const putRunPattern = /\.run\(\s*startDate,\s*endDate,\s*salaryAmount,\s*depositAmount,\s*unpaidAmount,\s*clearedAmount,\s*totalPaid,\s*contractType,\s*notes,\s*now,\s*id\s*\)/;
if (putRunPattern.test(content)) {
  content = content.replace(
    putRunPattern,
    '.run(startDate, endDate, salaryAmount, depositAmount, unpaidAmount, clearedAmount, totalPaid, contractType, notes, weeklyNotes, now, id)'
  );
  console.log('✓ Updated PUT run() parameters');
}

// 6. Fix PUT /contracts - Extract weeklyNotes from request body
const putBodyPattern = /const \{ startDate, endDate, salaryAmount, depositAmount, unpaidAmount, clearedAmount, totalPaid, contractType, notes \} = req\.body;/;
if (putBodyPattern.test(content)) {
  content = content.replace(
    putBodyPattern,
    'const { startDate, endDate, salaryAmount, depositAmount, unpaidAmount, clearedAmount, totalPaid, contractType, notes, weeklyNotes } = req.body;'
  );
  console.log('✓ Updated PUT body extraction');
}

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('\nSUCCESS: KOL API updated with weekly_notes support');
