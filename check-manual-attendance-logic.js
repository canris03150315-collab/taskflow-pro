const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== Checking manual attendance POST route ===\n');

// Find the POST /manual route
const lines = content.split('\n');
let inManualRoute = false;
let routeLines = [];

lines.forEach((line, i) => {
  if (line.includes("router.post('/manual'") || line.includes('router.post("/manual"')) {
    inManualRoute = true;
  }
  
  if (inManualRoute) {
    routeLines.push({ num: i + 1, text: line });
    
    // Stop at the next route or end of function
    if (line.includes('});') && routeLines.length > 20) {
      inManualRoute = false;
    }
  }
});

console.log('Found manual attendance route:');
console.log('Total lines:', routeLines.length);

// Look for status setting
const statusLines = routeLines.filter(l => l.text.includes('status'));
console.log('\nStatus-related lines:');
statusLines.forEach(l => {
  console.log('Line', l.num, ':', l.text.trim());
});

// Look for clockOut handling
const clockOutLines = routeLines.filter(l => l.text.includes('clockOut') || l.text.includes('clock_out'));
console.log('\nClockOut-related lines:');
clockOutLines.forEach(l => {
  console.log('Line', l.num, ':', l.text.trim());
});
