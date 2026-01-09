const fs = require('fs');

const filePath = '/app/dist/database-v2.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Removing default departments from initialization...');

// Remove the three unwanted departments from defaultDepts array
content = content.replace(
  /\{ id: 'Engineering'[^}]+\},\s*/g,
  ''
);

content = content.replace(
  /\{ id: 'Marketing'[^}]+\},\s*/g,
  ''
);

content = content.replace(
  /\{ id: 'HR'[^}]+\},\s*/g,
  ''
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Removed Engineering, Marketing, HR from default departments');
console.log('Only Management and UNASSIGNED will be created on initialization');
