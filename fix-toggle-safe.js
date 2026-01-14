const fs = require('fs');

console.log('Safely fixing toggle route...');

try {
  const routinesPath = '/app/dist/routes/routines.js';
  let content = fs.readFileSync(routinesPath, 'utf8');
  
  // Fix the incorrect line that stores boolean directly
  // Old: completedItems[index] = isCompleted;
  // New: Update the object's completed property correctly
  
  const oldLine = "completedItems[index] = isCompleted;";
  const newLine = "if (typeof completedItems[index] === 'object' && completedItems[index] !== null) { completedItems[index].completed = isCompleted; } else { completedItems[index] = { text: '', completed: isCompleted }; }";
  
  if (content.includes(oldLine)) {
    content = content.replace(oldLine, newLine);
    fs.writeFileSync(routinesPath, content, 'utf8');
    console.log('SUCCESS: Fixed toggle logic');
  } else {
    console.log('Line not found or already fixed');
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
