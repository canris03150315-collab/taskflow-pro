// Fix tasks count query issue (Pure ASCII)
const fs = require('fs');

console.log('Fixing tasks count query...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Find the problematic count query line
const oldCountQuery = "const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');";

// Replace with correct version that handles multiline SELECT
const newCountQuery = "const countQuery = query.replace(/SELECT[\\s\\S]*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY[\\s\\S]*$/, '');";

if (content.includes(oldCountQuery)) {
    content = content.replace(oldCountQuery, newCountQuery);
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Fixed count query regex');
    console.log('Now handles multiline SELECT statements correctly');
} else {
    console.log('ERROR: Could not find count query line');
    console.log('Trying alternative fix...');
    
    // Alternative: find and replace the regex pattern
    const altOld = "query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM')";
    const altNew = "query.replace(/SELECT[\\\\s\\\\S]*?FROM/, 'SELECT COUNT(*) as total FROM')";
    
    if (content.includes(altOld)) {
        content = content.replace(altOld, altNew);
        
        // Also fix ORDER BY regex
        content = content.replace(
            "replace(/ORDER BY.*$/,",
            "replace(/ORDER BY[\\\\s\\\\S]*$/,"
        );
        
        fs.writeFileSync(tasksPath, content, 'utf8');
        console.log('SUCCESS: Fixed using alternative pattern');
    } else {
        console.log('ERROR: Could not find any matching pattern');
        process.exit(1);
    }
}
