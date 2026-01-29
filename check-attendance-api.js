const fs = require('fs');

console.log('=== Check Attendance API ===\n');

// Check if attendance routes exist
const routesPath = '/app/dist/routes';
const files = fs.readdirSync(routesPath);

console.log('Test 1: Check for attendance route files');
const attendanceFiles = files.filter(f => f.includes('attendance'));
console.log('Attendance route files:', attendanceFiles.join(', '));

if (attendanceFiles.length === 0) {
  console.log('ERROR: No attendance route files found!');
  console.log('Available route files:', files.join(', '));
  process.exit(1);
}

// Check attendance.js content
const attendancePath = '/app/dist/routes/attendance.js';
if (fs.existsSync(attendancePath)) {
  console.log('\nTest 2: Check attendance.js routes');
  const content = fs.readFileSync(attendancePath, 'utf8');
  
  // Check for POST route (clock in/out)
  const hasPostRoute = content.includes('router.post(') || content.includes("router.post('");
  console.log('Has POST route:', hasPostRoute);
  
  // Check for GET route (get records)
  const hasGetRoute = content.includes('router.get(') || content.includes("router.get('");
  console.log('Has GET route:', hasGetRoute);
  
  // Check for database operations
  const hasDbInsert = content.includes('INSERT INTO attendance_records');
  console.log('Has INSERT operation:', hasDbInsert);
  
  // Find all routes
  const routes = content.match(/router\.(get|post|put|delete)\(['"](.*?)['"]/g);
  if (routes) {
    console.log('Available routes:', routes.join(', '));
  }
  
  // Check if it's using dbCall
  const usesDbCall = content.includes('dbCall');
  console.log('Uses dbCall adapter:', usesDbCall);
  
} else {
  console.log('ERROR: attendance.js not found!');
}

// Check server.js to see if attendance routes are registered
console.log('\nTest 3: Check if attendance routes are registered');
const serverPath = '/app/dist/index.js';
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  const hasAttendanceRoute = serverContent.includes('attendance');
  console.log('Server has attendance routes:', hasAttendanceRoute);
  
  // Find the registration
  const attendanceMatch = serverContent.match(/app\.use\(['"\/].*?attendance.*?\)/g);
  if (attendanceMatch) {
    console.log('Attendance registration:', attendanceMatch.join(', '));
  }
} else {
  console.log('Server file not found at', serverPath);
}

console.log('\n=== Check Complete ===');
