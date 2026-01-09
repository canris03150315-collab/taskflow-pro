// Test SUPERVISOR query with FIXED logic
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Testing SUPERVISOR query with fixed logic...');

const userId = 'user-1767326481715-40lkufxrh';
const userDept = 'Engineering';

try {
    let query = `
      SELECT t.*,
             u.name as assigned_user_name,
             creator.name as created_by_name,
             dept.name as department_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN departments dept ON t.target_department = dept.id
      WHERE 1=1
     AND (t.target_department = ? OR t.created_by = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL AND t.target_department IS NULL)) AND t.is_archived = ? ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    
    const params = [userDept, userId, 0, 50, 0];
    
    console.log('\n=== Query ===');
    console.log(query);
    console.log('Params:', params);
    
    const tasks = db.prepare(query).all(...params);
    
    console.log('\n=== Results ===');
    console.log('Tasks found:', tasks.length);
    
    if (tasks.length > 0) {
        console.log('\n✅ SUCCESS: SUPERVISOR can now see public tasks!');
        tasks.forEach(t => {
            console.log(`\n- Task: ${t.title}`);
            console.log(`  ID: ${t.id}`);
            console.log(`  Created by: ${t.created_by_name} (${t.created_by})`);
            console.log(`  Target dept: ${t.target_department || 'null (public)'}`);
            console.log(`  Assigned to user: ${t.assigned_to_user_id || 'null'}`);
            console.log(`  Assigned to dept: ${t.assigned_to_department || 'null'}`);
        });
    } else {
        console.log('\n❌ ERROR: Still no tasks found');
    }
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
