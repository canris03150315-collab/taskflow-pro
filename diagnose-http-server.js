const fs = require('fs');

console.log('=== Diagnosing HTTP Server Issue ===\n');

// Check if server.js or index.js exists
const serverPath = '/app/dist/index.js';
if (!fs.existsSync(serverPath)) {
  console.log('ERROR: Server file not found at', serverPath);
  process.exit(1);
}

console.log('Reading server file...');
const content = fs.readFileSync(serverPath, 'utf8');

// Check for HTTP server setup
const hasHttpServer = content.includes('http.createServer') || content.includes('httpServer');
const hasPort3001 = content.includes('3001');

console.log('\n=== Analysis ===');
console.log('Has HTTP server code:', hasHttpServer);
console.log('Has port 3001 reference:', hasPort3001);

// Check if HTTP server is listening
if (content.includes('httpServer.listen')) {
  console.log('\n✓ HTTP server listen code found');
  const listenMatch = content.match(/httpServer\.listen\([^)]+\)/g);
  if (listenMatch) {
    console.log('Listen code:', listenMatch[0]);
  }
} else {
  console.log('\n✗ HTTP server listen code NOT found');
}

// Check actual listening ports
console.log('\n=== Checking actual listening ports ===');
const { execSync } = require('child_process');
try {
  const netstat = execSync('netstat -tlnp 2>/dev/null | grep node || ss -tlnp 2>/dev/null | grep node || echo "Cannot check ports"').toString();
  console.log(netstat);
} catch (e) {
  console.log('Cannot execute netstat/ss');
}

console.log('\n=== Recommendation ===');
if (!hasHttpServer || !hasPort3001) {
  console.log('❌ HTTP server (port 3001) is NOT configured in the code');
  console.log('Need to add HTTP server setup to index.js');
} else {
  console.log('✓ HTTP server code exists, but may not be running');
  console.log('Check if there are any startup errors');
}
