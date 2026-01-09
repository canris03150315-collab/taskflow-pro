// Complete flow diagnosis (Pure ASCII)
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== COMPLETE FLOW DIAGNOSIS ===\n');

const taskId = 'task-1767350493468-icvplvfqs';

try {
    // 1. Check database timeline records
    console.log('1. DATABASE CHECK:');
    const timeline = db.prepare('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp DESC LIMIT 5').all(taskId);
    console.log(`   Found ${timeline.length} timeline records`);
    
    if (timeline.length > 0) {
        console.log('   Latest record:');
        console.log('   - ID:', timeline[0].id);
        console.log('   - Content:', timeline[0].content);
        console.log('   - Progress:', timeline[0].progress);
        console.log('   - Timestamp:', timeline[0].timestamp);
    }
    
    // 2. Check task basic info
    console.log('\n2. TASK INFO:');
    const task = db.prepare('SELECT id, title, progress, status FROM tasks WHERE id = ?').get(taskId);
    console.log('   - Title:', task.title);
    console.log('   - Progress:', task.progress);
    console.log('   - Status:', task.status);
    
    // 3. Simulate GET /tasks/:id response
    console.log('\n3. BACKEND GET /tasks/:id SIMULATION:');
    const fullTask = db.prepare(`
        SELECT t.*,
               u.name as assigned_user_name,
               creator.name as created_by_name,
               dept.name as department_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN departments dept ON t.target_department = dept.id
        WHERE t.id = ?
    `).get(taskId);
    
    const timelineForApi = db.prepare('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp ASC').all(taskId);
    
    console.log('   Task fields returned:', Object.keys(fullTask).join(', '));
    console.log('   Timeline records count:', timelineForApi.length);
    
    if (timelineForApi.length > 0) {
        console.log('   First timeline entry:');
        console.log('   - user_id:', timelineForApi[0].user_id);
        console.log('   - content:', timelineForApi[0].content);
        console.log('   - timestamp:', timelineForApi[0].timestamp);
    }
    
    // 4. Check if timeline would be included in response
    console.log('\n4. API RESPONSE CHECK:');
    const apiResponse = {
        ...fullTask,
        timeline: timelineForApi
    };
    console.log('   Response includes timeline:', 'timeline' in apiResponse);
    console.log('   Timeline is array:', Array.isArray(apiResponse.timeline));
    console.log('   Timeline length:', apiResponse.timeline.length);
    
    // 5. Check timeline structure
    console.log('\n5. TIMELINE STRUCTURE:');
    if (timelineForApi.length > 0) {
        const firstEntry = timelineForApi[0];
        console.log('   Fields in timeline entry:', Object.keys(firstEntry).join(', '));
        console.log('   Has user_id:', 'user_id' in firstEntry);
        console.log('   Has content:', 'content' in firstEntry);
        console.log('   Has timestamp:', 'timestamp' in firstEntry);
        console.log('   Has progress:', 'progress' in firstEntry);
    }
    
    console.log('\n=== DIAGNOSIS COMPLETE ===');
    console.log('\nSUMMARY:');
    console.log('- Database has timeline records:', timeline.length > 0 ? 'YES' : 'NO');
    console.log('- Backend would return timeline:', timelineForApi.length > 0 ? 'YES' : 'NO');
    console.log('- Timeline structure valid:', timelineForApi.length > 0 && 'content' in timelineForApi[0] ? 'YES' : 'NO');
    
} catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
}

db.close();
