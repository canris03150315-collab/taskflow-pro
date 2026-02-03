const fs = require('fs');

console.log('=== Adding Error Logging to /parse Endpoint ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Finding /parse endpoint...\n');

// Find the try-catch block in /parse endpoint
const parseRouteStart = content.indexOf("router.post('/parse'");
const parseRouteEnd = content.indexOf('});', parseRouteStart + 500);

if (parseRouteStart === -1) {
  console.log('ERROR: /parse endpoint not found');
  process.exit(1);
}

console.log('Found /parse endpoint');

// Check if error logging already exists
if (content.includes('Parse endpoint error:')) {
  console.log('Error logging already exists');
} else {
  console.log('\nStep 2: Adding detailed error logging...\n');
  
  // Find the catch block
  const catchIndex = content.indexOf('} catch (error) {', parseRouteStart);
  
  if (catchIndex > parseRouteStart && catchIndex < parseRouteEnd) {
    const afterCatch = catchIndex + '} catch (error) {'.length;
    
    const errorLogging = `
    console.error('Parse endpoint error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request file:', req.file ? 'exists' : 'missing');`;
    
    content = content.slice(0, afterCatch) + errorLogging + content.slice(afterCatch);
    
    fs.writeFileSync(routePath, content, 'utf8');
    console.log('Error logging added successfully');
  } else {
    console.log('ERROR: Could not find catch block');
    process.exit(1);
  }
}

console.log('\nStep 3: Verifying...\n');

const verify = fs.readFileSync(routePath, 'utf8');
if (verify.includes('Parse endpoint error:')) {
  console.log('✅ Verification passed');
} else {
  console.log('❌ Verification failed');
  process.exit(1);
}

console.log('\n=== Complete ===');
