// Test if count query is now working correctly
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Testing fixed count query...');

const userId = 'user-1767326481715-40lkufxrh';
const userDept = 'dept-1';

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
     AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL)) AND t.is_archived = ? ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    
    const params = [userId, userDept, 0, 50, 0];
    
    // Use the FIXED regex pattern
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY[\s\S]*$/, '');
    
    console.log('\n=== Fixed Count Query ===');
    console.log(countQuery);
    console.log('Params:', params.slice(0, -2));
    
    // Simulate db.get (which is actually SecureDatabase wrapper)
    const stmt = db.prepare(countQuery);
    const countResult = stmt.get(...params.slice(0, -2));
    
    console.log('\nCount Result:', countResult);
    
    if (countResult && typeof countResult.total === 'number') {
        console.log('\n✅ SUCCESS: Count query returns correct format');
        console.log('Total tasks:', countResult.total);
    } else {
        console.log('\n❌ ERROR: Count query still broken');
        console.log('Result type:', typeof countResult);
        console.log('Has total property:', countResult ? 'total' in countResult : 'N/A');
    }
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
