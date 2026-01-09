const fs = require('fs');

const filePath = '/app/dist/routes/announcements.js';

try {
  console.log('=== Checking announcements.js route ===\n');
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check POST route
  console.log('1. Checking POST route for images support...');
  if (content.includes('const { title, content, priority, images } = req.body')) {
    console.log('   ✓ POST route extracts images from req.body');
  } else {
    console.log('   ✗ POST route does NOT extract images from req.body');
  }
  
  if (content.includes('const imagesJson = JSON.stringify(images || [])')) {
    console.log('   ✓ POST route converts images to JSON');
  } else {
    console.log('   ✗ POST route does NOT convert images to JSON');
  }
  
  if (content.includes('INSERT INTO announcements (id, title, content, priority, images, created_at, updated_at)')) {
    console.log('   ✓ POST route includes images in INSERT');
  } else {
    console.log('   ✗ POST route does NOT include images in INSERT');
  }
  
  // Check GET route
  console.log('\n2. Checking GET route for images parsing...');
  if (content.includes('images: ann.images ? JSON.parse(ann.images) : []')) {
    console.log('   ✓ GET route parses images JSON');
  } else {
    console.log('   ✗ GET route does NOT parse images JSON');
  }
  
  // Check PUT route
  console.log('\n3. Checking PUT route for images support...');
  if (content.includes('const { title, content, priority, images } = req.body') && content.includes('UPDATE announcements SET')) {
    console.log('   ✓ PUT route extracts images from req.body');
  } else {
    console.log('   ✗ PUT route does NOT extract images from req.body');
  }
  
  console.log('\n=== Check Complete ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
