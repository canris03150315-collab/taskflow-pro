// Direct fix for transaction error (Pure ASCII)
const fs = require('fs');

console.log('Directly fixing transaction block...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Find the exact transaction block with context
const searchPattern = `// \u4F7F\u7528\u4E8B\u52D9\u66F4\u65B0
        db.transaction(() => {
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

const replacement = `// \u66F4\u65B0\u4EFB\u52D9
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

if (content.includes(searchPattern)) {
    content = content.replace(searchPattern, replacement);
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Transaction block replaced');
} else {
    console.log('Pattern not found, trying line-by-line replacement...');
    
    // Replace line by line
    content = content.replace(
        /\/\/ 使用事務更新\n\s+db\.transaction\(\(\) => \{/,
        '// 更新任務'
    );
    
    content = content.replace(
        /db\.run\(`UPDATE tasks SET \$\{updates\.join\(', '\)\} WHERE id = \?`, params\);/,
        'await db.run(`UPDATE tasks SET ${updates.join(\', \')} WHERE id = ?`, params);'
    );
    
    content = content.replace(
        /db\.run\(`\n\s+INSERT INTO task_timeline/g,
        'await db.run(`\n                INSERT INTO task_timeline'
    );
    
    content = content.replace(
        /\}\)\(\);[\s]*\/\/ 記錄日誌/,
        '}\n        // 記錄日誌'
    );
    
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Applied line-by-line fixes');
}

// Verify the fix
const newContent = fs.readFileSync(tasksPath, 'utf8');
if (newContent.includes('db.transaction')) {
    console.log('WARNING: db.transaction still exists in file');
    process.exit(1);
} else {
    console.log('VERIFIED: No db.transaction found');
}
