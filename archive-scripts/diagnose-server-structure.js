const fs = require('fs');

const serverPath = '/app/dist/server.js';
const content = fs.readFileSync(serverPath, 'utf8');

console.log('=== Diagnosing server.js structure ===\n');

// Find all app.use patterns
const lines = content.split('\n');
const routeLines = [];

lines.forEach((line, i) => {
  if (line.includes("app.use('/api/") || line.includes('app.use("/api/')) {
    routeLines.push({ line: i + 1, content: line.trim() });
  }
});

if (routeLines.length > 0) {
  console.log('Found route registrations:');
  routeLines.forEach(r => {
    console.log(`  Line ${r.line}: ${r.content}`);
  });
} else {
  console.log('No route registrations found with app.use pattern');
}

// Check for this.app.use pattern (class-based)
const classRouteLines = [];
lines.forEach((line, i) => {
  if (line.includes("this.app.use('/api/") || line.includes('this.app.use("/api/')) {
    classRouteLines.push({ line: i + 1, content: line.trim() });
  }
});

if (classRouteLines.length > 0) {
  console.log('\nFound class-based route registrations:');
  classRouteLines.forEach(r => {
    console.log(`  Line ${r.line}: ${r.content}`);
  });
  
  // Find the last one to know where to insert
  const lastRoute = classRouteLines[classRouteLines.length - 1];
  console.log(`\nLast route at line ${lastRoute.line}`);
  console.log('Insert new route after this line');
}

// Check if backup route already exists
if (content.includes('/api/backup')) {
  console.log('\n✓ Backup route already registered');
} else {
  console.log('\n✗ Backup route NOT registered');
}
