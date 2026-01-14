const fs = require('fs');

console.log('Fixing duplicate toggle route...');

try {
  const routinesPath = '/app/dist/routes/routines.js';
  let content = fs.readFileSync(routinesPath, 'utf8');
  
  // Find and remove the incorrect toggle route that stores boolean directly
  // Pattern: router.post('/records/:id/toggle'... completedItems[index] = isCompleted;
  
  const badRoutePattern = /router\.post\('\/records\/:id\/toggle'[\s\S]*?completedItems\[index\] = isCompleted;[\s\S]*?}\);/;
  
  if (badRoutePattern.test(content)) {
    content = content.replace(badRoutePattern, '// Removed duplicate incorrect toggle route');
    fs.writeFileSync(routinesPath, content, 'utf8');
    console.log('SUCCESS: Removed incorrect toggle route');
  } else {
    console.log('Pattern not found, checking manually...');
    
    // Alternative: Replace the bad line with correct logic
    const badLine = "completedItems[index] = isCompleted;";
    if (content.includes(badLine)) {
      // Replace with correct logic
      content = content.replace(
        badLine,
        "if (typeof completedItems[index] === 'object') { completedItems[index].completed = isCompleted; } else { completedItems[index] = { text: '', completed: isCompleted }; }"
      );
      fs.writeFileSync(routinesPath, content, 'utf8');
      console.log('SUCCESS: Fixed toggle logic');
    } else {
      console.log('Bad line not found');
    }
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
