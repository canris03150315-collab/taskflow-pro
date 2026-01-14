const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing routine history field mapping...');

// Find and replace the incorrect field mapping
const oldMapping = `const mappedRecords = records.map(r => ({
      id: r.id,
      user_id: r.user_id,
      department_id: r.department_id,
      date: r.date,
      items: JSON.parse(r.items || '[]')
    }));`;

const newMapping = `const mappedRecords = records.map(r => ({
      id: r.id,
      user_id: r.user_id,
      department_id: r.department_id,
      date: r.date,
      items: JSON.parse(r.completed_items || '[]')
    }));`;

if (content.includes(oldMapping)) {
  content = content.replace(oldMapping, newMapping);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Fixed field mapping from r.items to r.completed_items');
} else {
  console.log('WARNING: Pattern not found, trying alternative approach...');
  
  // Alternative: just replace the specific line
  content = content.replace(
    /items: JSON\.parse\(r\.items \|\| '\[\]'\)/g,
    "items: JSON.parse(r.completed_items || '[]')"
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Fixed using alternative pattern');
}

console.log('Fix complete!');
