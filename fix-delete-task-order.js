const fs = require('fs');

const filePath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing DELETE task route order...');

// Find the DELETE route block (from line 12 to about line 54)
const deleteRouteStart = content.indexOf("// DELETE /:id");
const deleteRouteEnd = content.indexOf("exports.taskRoutes = router;");

if (deleteRouteStart === -1 || deleteRouteEnd === -1) {
  console.log('ERROR: Could not find DELETE route or exports');
  process.exit(1);
}

// Check if DELETE route is BEFORE exports (correct) or AFTER (wrong)
if (deleteRouteStart < deleteRouteEnd) {
  console.log('DELETE route is already before exports - checking if exports is in wrong place');
}

// The problem: exports.taskRoutes = router is in the MIDDLE of the file
// We need to move it to the END

// Find where the actual routes end (last router.xxx call before final closing)
const exportsLine = "exports.taskRoutes = router;";
const exportsIndex = content.indexOf(exportsLine);

if (exportsIndex !== -1) {
  // Check if there are more router definitions after exports
  const afterExports = content.substring(exportsIndex + exportsLine.length);
  if (afterExports.includes('router.get') || afterExports.includes('router.post') || afterExports.includes('router.put') || afterExports.includes('router.patch')) {
    console.log('Found routes defined AFTER exports - this is the bug!');
    
    // Remove the early exports line
    content = content.replace(exportsLine + '\n', '');
    
    // Add exports at the very end
    content = content.trimEnd() + '\n\nexports.taskRoutes = router;\n';
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Moved exports to end of file');
  } else {
    console.log('Exports is already at correct position');
  }
} else {
  console.log('ERROR: exports.taskRoutes not found');
}
