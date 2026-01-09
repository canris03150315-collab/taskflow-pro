const fs = require('fs');

const filePath = '/app/dist/routes/departments.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding schedule_rules to cascade delete...');

// Find the cascade delete section and add schedule_rules
content = content.replace(
  /await db\.run\('DELETE FROM schedules WHERE department_id = \?', \[id\]\);/,
  `await db.run('DELETE FROM schedules WHERE department_id = ?', [id]);
        await db.run('DELETE FROM schedule_rules WHERE department_id = ?', [id]);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added schedule_rules to cascade delete');
