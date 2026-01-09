// Setup cleanup timer in server startup
// This script should be added to the server initialization

const fs = require('fs');
const path = '/app/dist/index.js';

console.log('=== Setting up Cleanup Timer ===\n');

// Read the server file
let content = fs.readFileSync(path, 'utf8');

// Check if cleanup timer already exists
if (content.includes('APPROVAL-CLEANUP-TIMER')) {
  console.log('Cleanup timer already exists, skipping...');
  process.exit(0);
}

// Find the position to insert the cleanup timer
// Look for where the server starts listening
const insertMarker = 'this.server.listen';
const insertPosition = content.indexOf(insertMarker);

if (insertPosition === -1) {
  console.error('ERROR: Could not find server.listen in index.js');
  process.exit(1);
}

// Create the cleanup timer code
const cleanupCode = `
    // APPROVAL-CLEANUP-TIMER: Cleanup expired authorizations every 5 minutes
    const { cleanupExpiredAuthorizations } = require('./routes/report-approval-routes');
    setInterval(() => {
      if (this.db) {
        cleanupExpiredAuthorizations(this.db);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    console.log('[SERVER] Approval cleanup timer started (every 5 minutes)');
    
    `;

// Insert the cleanup code before server.listen
const beforeListen = content.substring(0, insertPosition);
const afterListen = content.substring(insertPosition);
const newContent = beforeListen + cleanupCode + afterListen;

// Write back
fs.writeFileSync(path, newContent, 'utf8');

console.log('SUCCESS: Cleanup timer added to server startup');
console.log('Location: Before server.listen()');
console.log('Interval: Every 5 minutes');

console.log('\n=== Setup Complete ===');
