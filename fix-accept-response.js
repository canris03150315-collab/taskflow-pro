// Fix accept route to return complete task object (Pure ASCII)
const fs = require('fs');

console.log('Fixing accept route response...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Find the accept route's response
const oldResponse = "res.json({ message: '\u4EFB\u52D9\u63A5\u53D7\u6210\u529F' });";

// Replace with response that includes the updated task
const newResponse = `// \u7372\u53D6\u66F4\u65B0\u5F8C\u7684\u4EFB\u52D9\u6578\u64DA
        const updatedTask = await db.get(\`
            SELECT t.*,
                   u.name as assigned_user_name,
                   creator.name as created_by_name,
                   dept.name as department_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to_user_id = u.id
            LEFT JOIN users creator ON t.created_by = creator.id
            LEFT JOIN departments dept ON t.target_department = dept.id
            WHERE t.id = ?
        \`, [id]);
        
        // \u7372\u53D6\u6642\u9593\u8EF8
        const timeline = await db.all('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp DESC', [id]);
        updatedTask.timeline = timeline;
        
        res.json({ message: '\u4EFB\u52D9\u63A5\u53D7\u6210\u529F', task: updatedTask });`;

if (content.includes(oldResponse)) {
    content = content.replace(oldResponse, newResponse);
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Fixed accept route response');
    console.log('Now returns complete task object with:');
    console.log('  - Updated task data');
    console.log('  - Timeline entries');
    console.log('  - User and department names');
} else {
    console.log('ERROR: Could not find accept response');
    console.log('Trying alternative approach...');
    
    // Try to find the line before res.json
    const pattern = /await \(0, logger_1\.logSystemAction\)\(db, currentUser, 'ACCEPT_TASK'[\s\S]*?\);[\s\S]*?res\.json\({ message: '[^']*' }\);/;
    const match = content.match(pattern);
    
    if (match) {
        const oldBlock = match[0];
        const newBlock = oldBlock.replace(
            /res\.json\({ message: '[^']*' }\);/,
            newResponse
        );
        content = content.replace(oldBlock, newBlock);
        fs.writeFileSync(tasksPath, content, 'utf8');
        console.log('SUCCESS: Fixed using alternative pattern');
    } else {
        console.log('ERROR: Could not find any matching pattern');
        process.exit(1);
    }
}
