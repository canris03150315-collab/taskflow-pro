const fs = require('fs');

console.log('=== Fixing Finance PUT Route ===');

const filePath = '/app/dist/routes/finance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// Replace the PUT route UPDATE logic
const putPattern = /const \{ type, amount, description, category, date, status \} = req\.body;[\s\S]*?const now = new Date\(\)\.toISOString\(\);[\s\S]*?dbCall\(db, 'prepare',[\s\S]*?'UPDATE finance SET type = \?, amount = \?, description = \?, category = \?, status = \?, updated_at = \? WHERE id = \?'[\s\S]*?\)\.run\([\s\S]*?type,[\s\S]*?Number\(amount\),[\s\S]*?description,[\s\S]*?category,[\s\S]*?status \|\| 'PENDING',[\s\S]*?now,[\s\S]*?id[\s\S]*?\);[\s\S]*?const record = dbCall\(db, 'prepare', 'SELECT \* FROM finance WHERE id = \?'\)\.get\(id\);/;

const replacement = `const { type, amount, description, category, date, status } = req.body;
    
    const updateData = {};
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = amount;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = date;
    if (status !== undefined) updateData.status = status;
    
    const record = await FinanceService.updateRecord(db, id, updateData);`;

if (putPattern.test(content)) {
    content = content.replace(putPattern, replacement);
    console.log('+ Replaced PUT route with FinanceService.updateRecord');
} else {
    console.log('! Pattern not found, trying simpler approach...');
    
    // Simpler pattern - just replace the dbCall section
    const simplePattern = /dbCall\(db, 'prepare',[\s\S]*?'UPDATE finance SET type = \?, amount = \?, description = \?, category = \?, status = \?, updated_at = \? WHERE id = \?'[\s\S]*?\)\.run\([^)]+\);[\s\S]*?const record = dbCall\(db, 'prepare', 'SELECT \* FROM finance WHERE id = \?'\)\.get\(id\);/;
    
    if (simplePattern.test(content)) {
        const simpleReplacement = `const updateData = {};
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = amount;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = date;
    if (status !== undefined) updateData.status = status;
    
    const record = await FinanceService.updateRecord(db, id, updateData);`;
        
        content = content.replace(simplePattern, simpleReplacement);
        console.log('+ Replaced PUT route (simple pattern)');
    } else {
        console.error('ERROR: Could not find PUT route pattern');
    }
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS');
