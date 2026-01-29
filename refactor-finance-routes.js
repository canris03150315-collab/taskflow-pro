const fs = require('fs');

console.log('=== Refactoring Finance Routes ===');

const filePath = '/app/dist/routes/finance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// 1. Add FinanceService import at the top
if (!content.includes("const FinanceService = require('../../services/financeService');")) {
    const lastRequireIndex = content.lastIndexOf("const auth_1 = require(\"../middleware/auth\");");
    if (lastRequireIndex !== -1) {
        const insertPos = content.indexOf('\n', lastRequireIndex) + 1;
        content = content.slice(0, insertPos) + 
                  "const FinanceService = require('../../services/financeService');\n" +
                  content.slice(insertPos);
        console.log('+ Added FinanceService import');
    }
}

// 2. Refactor GET / route
const getAllPattern = /const records = dbCall\(db, 'prepare', 'SELECT \* FROM finance ORDER BY created_at DESC'\)\.all\(\);/;
if (getAllPattern.test(content)) {
    content = content.replace(getAllPattern, 'const records = await FinanceService.getAllRecords(db);');
    console.log('+ Replaced GET / route');
}

// 3. Refactor POST / route - INSERT statement
// Keep all the logging and validation, only replace the INSERT
const postInsertPattern = /dbCall\(db, 'prepare',[\s\S]*?'INSERT INTO finance \(id, type, amount, description, category, user_id, department_id, date, status, created_at, updated_at, scope, owner_id, recorded_by, attachment\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)'[\s\S]*?\)\.run\([\s\S]*?id,[\s\S]*?type,[\s\S]*?finalAmount,[\s\S]*?description \|\| '',[\s\S]*?category \|\| 'OTHER',[\s\S]*?userId,[\s\S]*?deptId,[\s\S]*?recordDate,[\s\S]*?'PENDING',[\s\S]*?now,[\s\S]*?now,[\s\S]*?scope \|\| 'DEPARTMENT',[\s\S]*?ownerId \|\| null,[\s\S]*?recordedBy \|\| userId,[\s\S]*?attachment \|\| null[\s\S]*?\);[\s\S]*?const record = dbCall\(db, 'prepare', 'SELECT \* FROM finance WHERE id = \?'\)\.get\(id\);/;

if (postInsertPattern.test(content)) {
    const replacement = `const record = await FinanceService.createRecord(db, {
      type,
      amount: finalAmount,
      description,
      category,
      userId,
      departmentId: deptId,
      date: recordDate,
      scope,
      ownerId,
      recordedBy,
      attachment
    });`;
    
    content = content.replace(postInsertPattern, replacement);
    console.log('+ Replaced POST / route INSERT');
}

// 4. Refactor PUT /:id route
const putUpdatePattern = /dbCall\(db, 'prepare',[\s\S]*?`UPDATE finance SET \$\{updates\.join\(', '\)\} WHERE id = \?`[\s\S]*?\)\.run\(\.\.\.params\);[\s\S]*?const record = dbCall\(db, 'prepare', 'SELECT \* FROM finance WHERE id = \?'\)\.get\(id\);/;

if (putUpdatePattern.test(content)) {
    const replacement = `const updateData = {};
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = amount;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = date;
    if (status !== undefined) updateData.status = status;
    
    const record = await FinanceService.updateRecord(db, id, updateData);`;
    
    content = content.replace(putUpdatePattern, replacement);
    console.log('+ Replaced PUT /:id route');
}

// 5. Refactor DELETE /:id route
const deletePattern = /dbCall\(db, 'prepare', 'DELETE FROM finance WHERE id = \?'\)\.run\(id\);/;
if (deletePattern.test(content)) {
    content = content.replace(deletePattern, 'await FinanceService.deleteRecord(db, id);');
    console.log('+ Replaced DELETE /:id route');
}

// 6. Refactor POST /:id/confirm route
const confirmPattern = /dbCall\(db, 'prepare',[\s\S]*?'UPDATE finance SET status = \?, updated_at = \? WHERE id = \?'[\s\S]*?\)\.run\('CONFIRMED', now, id\);[\s\S]*?const record = dbCall\(db, 'prepare', 'SELECT \* FROM finance WHERE id = \?'\)\.get\(id\);/;

if (confirmPattern.test(content)) {
    content = content.replace(confirmPattern, 'const record = await FinanceService.confirmRecord(db, id);');
    console.log('+ Replaced POST /:id/confirm route');
}

// Write modified file
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Summary ===');
console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS: Finance routes refactored');
