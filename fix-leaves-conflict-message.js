const fs = require('fs');

console.log('Fixing conflict message in leaves.js...\n');

try {
  const filePath = '/app/dist/routes/leaves.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the broken Chinese characters with English message
  content = content.replace(
    /message: `\?\?\?\?\?\?\?\?\?\?\?\(\$\{l\.start_date\} - \$\{l\.end_date\}\)`/g,
    'message: `Conflict with leave (${l.start_date} - ${l.end_date})`'
  );
  
  console.log('Fixed conflict message');
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nConflict message fixed successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
