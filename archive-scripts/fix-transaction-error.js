// Fix transaction error in PUT route (Pure ASCII)
const fs = require('fs');

console.log('Fixing transaction error in PUT route...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Find the transaction block and replace with sequential execution
const oldTransaction = `db.transaction(() => {
            db.run(\`UPDATE tasks SET \${updates.join(', ')} WHERE id = ?\`, params);
            // \u6DFB\u52A0\u6642\u9593\u8EF8\u8A18\u9304
            if (timelineContent) {
                db.run(\`
          INSERT INTO task_timeline (id, task_id, user_id, content, progress, is_offline)
          VALUES (?, ?, ?, ?, ?, ?)
        \`, [
                    \`timeline-\${Date.now()}\`,
                    id,
                    currentUser.id,
                    timelineContent.trim(),
                    progress || existingTask.progress,
                    is_offline ? 1 : 0
                ]);
            }
        })();`;

const newSequential = `// \u66F4\u65B0\u4EFB\u52D9
        await db.run(\`UPDATE tasks SET \${updates.join(', ')} WHERE id = ?\`, params);
        
        // \u6DFB\u52A0\u6642\u9593\u8EF8\u8A18\u9304
        if (timelineContent) {
            await db.run(\`
                INSERT INTO task_timeline (id, task_id, user_id, content, progress, is_offline)
                VALUES (?, ?, ?, ?, ?, ?)
            \`, [
                \`timeline-\${Date.now()}\`,
                id,
                currentUser.id,
                timelineContent.trim(),
                progress || existingTask.progress,
                is_offline ? 1 : 0
            ]);
        }`;

if (content.includes('db.transaction(() => {')) {
    content = content.replace(oldTransaction, newSequential);
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Fixed transaction error');
    console.log('Changed from db.transaction() to sequential await execution');
} else {
    console.log('ERROR: Could not find transaction block');
    console.log('Trying alternative approach...');
    
    // Try to find and replace just the transaction wrapper
    const pattern = /db\.transaction\(\(\) => \{[\s\S]*?\}\)\(\);/;
    const match = content.match(pattern);
    
    if (match) {
        const oldBlock = match[0];
        // Remove transaction wrapper and add await
        let newBlock = oldBlock
            .replace('db.transaction(() => {', '')
            .replace('})();', '')
            .replace(/db\.run\(/g, 'await db.run(')
            .trim();
        
        content = content.replace(oldBlock, newBlock);
        fs.writeFileSync(tasksPath, content, 'utf8');
        console.log('SUCCESS: Fixed using alternative pattern');
    } else {
        console.log('ERROR: Could not find any matching pattern');
        process.exit(1);
    }
}
