const fs = require('fs');

console.log('=== Fixing Duplicate Variable Declaration ===\n');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

// The issue: we added "const report = ..." but the variable was already declared
// We need to change our additions to use different variable names

// Find PUT route - change our added "const report" to "const existingReport"
let putFixed = false;
const putPattern = /\/\/ Check if this is user's own report within 7 days[\s\S]*?const report = dbCall\(db, 'get',/;
if (content.match(putPattern)) {
    content = content.replace(
        /\/\/ Check if this is user's own report within 7 days[\s\S]*?const report = dbCall\(db, 'get',/,
        (match) => match.replace('const report =', 'const reportCheck =')
    );
    // Also fix the references
    content = content.replace(/if \(!report\) \{[\s\S]*?return res\.status\(404\)\.json\({ error: 'Report not found' }\);[\s\S]*?}[\s\S]*?const isOwnReport = report\.user_id/g, 
        `if (!reportCheck) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const isOwnReport = reportCheck.user_id`
    );
    putFixed = true;
    console.log('✅ Fixed PUT route variable declaration');
}

// Find DELETE route - change our added "const report" to "const reportToDelete"
let deleteFixed = false;
const deletePattern = /router\.delete[\s\S]*?\/\/ Check if this is user's own report within 7 days[\s\S]*?const report = dbCall\(db, 'get',/;
if (content.match(deletePattern)) {
    // Find the DELETE section and fix it
    const deleteStart = content.indexOf('router.delete("/:id"');
    const deleteEnd = content.indexOf('});', deleteStart) + 3;
    let deleteSection = content.substring(deleteStart, deleteEnd);
    
    // Replace in DELETE section only
    deleteSection = deleteSection.replace(
        /\/\/ Check if this is user's own report within 7 days[\s\S]*?const report = dbCall/,
        (match) => match.replace('const report =', 'const reportToDelete =')
    );
    deleteSection = deleteSection.replace(/if \(!report\) \{/g, 'if (!reportToDelete) {');
    deleteSection = deleteSection.replace(/const isOwnReport = report\.user_id/g, 'const isOwnReport = reportToDelete.user_id');
    
    content = content.substring(0, deleteStart) + deleteSection + content.substring(deleteEnd);
    deleteFixed = true;
    console.log('✅ Fixed DELETE route variable declaration');
}

if (!putFixed && !deleteFixed) {
    console.log('❌ Could not find the patterns to fix');
    console.log('Will try alternate approach...');
    
    // Alternate: just rename all our added "const report" in the ownership checks
    const ownershipCheckPattern = /\/\/ Check if this is user's own report within 7 days\s*const report =/g;
    const matches = content.match(ownershipCheckPattern);
    
    if (matches && matches.length > 0) {
        // Replace first occurrence (PUT) with reportCheck
        content = content.replace(
            /\/\/ Check if this is user's own report within 7 days\s*const report =/,
            '// Check if this is user\'s own report within 7 days\n        const reportCheck ='
        );
        // Replace references in PUT section
        const putStart = content.indexOf('router.put("/:id"');
        const putEnd = content.indexOf('router.delete("/:id"', putStart);
        if (putStart > 0 && putEnd > putStart) {
            let putSection = content.substring(putStart, putEnd);
            putSection = putSection.replace(/if \(!report\) \{/g, 'if (!reportCheck) {');
            putSection = putSection.replace(/const isOwnReport = report\.user_id/g, 'const isOwnReport = reportCheck.user_id');
            putSection = putSection.replace(/const within7Days = isWithin7Days\(report\.created_at\)/g, 'const within7Days = isWithin7Days(reportCheck.created_at)');
            content = content.substring(0, putStart) + putSection + content.substring(putEnd);
        }
        
        // Replace second occurrence (DELETE) with reportToDelete
        content = content.replace(
            /\/\/ Check if this is user's own report within 7 days\s*const report =/,
            '// Check if this is user\'s own report within 7 days\n        const reportToDelete ='
        );
        // Replace references in DELETE section
        const deleteStart = content.indexOf('router.delete("/:id"');
        if (deleteStart > 0) {
            let deleteSection = content.substring(deleteStart);
            deleteSection = deleteSection.replace(/if \(!report\) \{/g, 'if (!reportToDelete) {');
            deleteSection = deleteSection.replace(/const isOwnReport = report\.user_id/g, 'const isOwnReport = reportToDelete.user_id');
            deleteSection = deleteSection.replace(/const within7Days = isWithin7Days\(report\.created_at\)/g, 'const within7Days = isWithin7Days(reportToDelete.created_at)');
            content = content.substring(0, deleteStart) + deleteSection;
        }
        
        console.log('✅ Fixed using alternate approach');
    }
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Fix Complete ===');
console.log('Renamed variables to avoid duplication:');
console.log('  PUT route: report -> reportCheck');
console.log('  DELETE route: report -> reportToDelete');
