const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix routine_records query - it doesn't have a 'status' column
// Instead, we need to parse completed_items JSON to calculate completion
const oldQuery = /const routineRecords = await db\.all\(`SELECT department_id, COUNT\(\*\) as total, SUM\(CASE WHEN status = 'completed' THEN 1 ELSE 0 END\) as completed FROM routine_records WHERE date = \? GROUP BY department_id`, \[today\]\);/;

const newQuery = `// Get routine records for today - note: completed_items is JSON
  const routineRecords = await db.all(\`SELECT id, department_id, completed_items FROM routine_records WHERE date = ?\`, [today]);
  
  // Calculate completion by department
  const routinesByDept = {};
  routineRecords.forEach(record => {
    if (!routinesByDept[record.department_id]) {
      routinesByDept[record.department_id] = { total: 0, completed: 0 };
    }
    try {
      const items = JSON.parse(record.completed_items || '[]');
      routinesByDept[record.department_id].total += items.length;
      routinesByDept[record.department_id].completed += items.filter(item => item.completed).length;
    } catch (e) {
      // Skip invalid JSON
    }
  });
  
  const routineRecordsSummary = Object.keys(routinesByDept).map(deptId => ({
    department_id: deptId,
    total: routinesByDept[deptId].total,
    completed: routinesByDept[deptId].completed
  }));`;

if (!oldQuery.test(content)) {
  console.log('ERROR: Cannot find routine_records query pattern');
  process.exit(1);
}

content = content.replace(oldQuery, newQuery);

// Also update the return statement to use routineRecordsSummary
content = content.replace(
  /routineRecords,/g,
  'routineRecords: routineRecordsSummary,'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed routine_records query to handle completed_items JSON');
