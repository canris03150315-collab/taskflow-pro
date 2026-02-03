console.log('=== Platform Revenue Complete Diagnosis ===\n');

const fs = require('fs');
const http = require('http');

// Step 1: Check if route file exists
console.log('[1/5] Checking route file...');
const routeFiles = [
  '/app/dist/routes/platform-revenue.js',
  '/app/dist/routes/platform-revenue-fixed.js',
  '/app/dist/routes/platform-revenue-extended.js'
];

let foundRoute = null;
routeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log('FOUND: ' + file + ' (' + stats.size + ' bytes)');
    foundRoute = file;
  }
});

if (!foundRoute) {
  console.log('NOT FOUND: No platform-revenue route file exists');
}
console.log('');

// Step 2: Check if route is registered in server.js
console.log('[2/5] Checking server.js registration...');
const serverPath = '/app/dist/server.js';
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  const hasRegistration = serverContent.includes('platform-revenue') || 
                         serverContent.includes('platformRevenue');
  if (hasRegistration) {
    console.log('FOUND: Route appears to be registered in server.js');
    const lines = serverContent.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('platform-revenue') || line.includes('platformRevenue')) {
        console.log('  Line ' + (idx + 1) + ': ' + line.trim());
      }
    });
  } else {
    console.log('NOT FOUND: Route not registered in server.js');
  }
} else {
  console.log('ERROR: server.js not found');
}
console.log('');

// Step 3: Test API endpoint
console.log('[3/5] Testing API endpoint...');
const testEndpoint = (path) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      resolve({ status: res.statusCode, exists: true });
    });

    req.on('error', () => {
      resolve({ status: 'ERROR', exists: false });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'TIMEOUT', exists: false });
    });

    req.end();
  });
};

testEndpoint('/api/platform-revenue').then(result => {
  if (result.exists) {
    console.log('API Status: ' + result.status);
    if (result.status === 401) {
      console.log('Result: Endpoint exists (requires auth)');
    } else if (result.status === 404) {
      console.log('Result: Endpoint not found');
    } else {
      console.log('Result: Endpoint accessible');
    }
  } else {
    console.log('Result: Endpoint unreachable');
  }
  console.log('');

  // Step 4: Check database tables
  console.log('[4/5] Checking database tables...');
  const Database = require('better-sqlite3');
  const db = new Database('/app/data/taskflow.db');
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%revenue%'").all();
  if (tables.length > 0) {
    console.log('Found ' + tables.length + ' revenue-related tables:');
    tables.forEach(table => {
      console.log('  - ' + table.name);
      const info = db.prepare('PRAGMA table_info(' + table.name + ')').all();
      console.log('    Columns: ' + info.map(col => col.name).join(', '));
    });
  } else {
    console.log('NOT FOUND: No revenue-related tables');
  }
  
  db.close();
  console.log('');

  // Step 5: Summary
  console.log('[5/5] Diagnosis Summary');
  console.log('='.repeat(50));
  console.log('Route File: ' + (foundRoute ? 'EXISTS' : 'MISSING'));
  console.log('Server Registration: ' + (hasRegistration ? 'YES' : 'NO'));
  console.log('API Endpoint: ' + (result.exists ? result.status : 'UNREACHABLE'));
  console.log('Database Tables: ' + (tables.length > 0 ? tables.length + ' found' : 'MISSING'));
  console.log('='.repeat(50));
  
  console.log('\nDiagnosis complete');
});
