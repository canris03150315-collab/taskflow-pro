const fs = require('fs');

console.log('Fixing routines.js syntax error...');

try {
  const routinesPath = '/app/dist/routes/routines.js';
  let content = fs.readFileSync(routinesPath, 'utf8');
  
  // Remove the leftover catch block from the incomplete route removal
  const badCode = `// Removed duplicate incorrect toggle route
  } catch (error) {
    console.error('Toggle item error:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});`;
  
  if (content.includes('// Removed duplicate incorrect toggle route')) {
    // Find and remove the entire leftover block
    content = content.replace(/\/\/ Removed duplicate incorrect toggle route[\s\S]*?\}\);[\s\n]*(?=router\.post)/g, '\n');
    fs.writeFileSync(routinesPath, content, 'utf8');
    console.log('SUCCESS: Removed leftover code');
  } else {
    console.log('Pattern not found');
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
