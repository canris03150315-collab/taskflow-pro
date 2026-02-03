const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Diagnosing KOL Contracts Issue ===\n');

// 1. Check table structure
const db = new Database('/app/data/taskflow.db');
const tableInfo = db.prepare('PRAGMA table_info(kol_contracts)').all();
console.log('Table Structure:');
console.log('Column count:', tableInfo.length);
tableInfo.forEach(col => {
  console.log(`  ${col.cid}: ${col.name} (${col.type})`);
});

// 2. Check POST route in kol.js
console.log('\n=== Checking POST /contracts route ===');
const kolJs = fs.readFileSync('/app/dist/routes/kol.js', 'utf8');

// Find the POST contracts route (around line 357)
const lines = kolJs.split('\n');
let inPostRoute = false;
let routeLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("router.post('/contracts'")) {
    inPostRoute = true;
    console.log(`Found POST /contracts at line ${i + 1}`);
  }
  
  if (inPostRoute) {
    routeLines.push(`${i + 1}: ${line}`);
    
    // Look for INSERT statement
    if (line.includes('INSERT INTO kol_contracts')) {
      console.log(`\nFound INSERT at line ${i + 1}`);
      // Get next 5 lines to see full INSERT
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        console.log(`${j + 1}: ${lines[j]}`);
      }
      break;
    }
    
    // Stop if we hit next route
    if (i > 350 && (line.includes('router.') && !line.includes("router.post('/contracts'"))) {
      break;
    }
  }
}

db.close();
console.log('\n=== Diagnosis Complete ===');
