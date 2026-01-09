// Fix GET /api/tasks to include timeline (Pure ASCII)
const fs = require('fs');

console.log('Fixing GET /api/tasks to include timeline...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Find where tasks are fetched and add timeline
const oldCode = `const tasks = await db.all(query, params);
        // \u7372\u53D6\u7E3D\u6578
        const countQuery = query.replace(/SELECT[\\s\\S]*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY[\\s\\S]*$/, '');
        const countResult = await db.get(countQuery, params.slice(0, -2));
        res.json({
            tasks,`;

const newCode = `const tasks = await db.all(query, params);
        
        // \u7372\u53D6\u6BCF\u500B\u4EFB\u52D9\u7684 timeline
        for (const task of tasks) {
            const timeline = await db.all('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp ASC', [task.id]);
            task.timeline = timeline;
        }
        
        // \u7372\u53D6\u7E3D\u6578
        const countQuery = query.replace(/SELECT[\\s\\S]*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY[\\s\\S]*$/, '');
        const countResult = await db.get(countQuery, params.slice(0, -2));
        res.json({
            tasks,`;

if (content.includes('const tasks = await db.all(query, params);')) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Added timeline to GET /api/tasks');
    console.log('Now the list route will return timeline for each task');
} else {
    console.log('ERROR: Could not find the pattern');
    process.exit(1);
}
