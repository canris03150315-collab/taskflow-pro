const fs = require('fs');
const path = '/app/dist/routes/tasks.js';

let content = fs.readFileSync(path, 'utf8');

// Remove db.transaction wrapper
content = content.replace('db.transaction(() => {', '// Transaction removed');
content = content.replace('})();', '');

fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: Removed db.transaction() from tasks.js');
