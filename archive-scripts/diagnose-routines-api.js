const http = require('http');
const https = require('https');

console.log('=== Routines API Diagnosis ===\n');

// Test 1: Check if routines history API exists
console.log('Test 1: GET /api/routines/history');
const httpsOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/routines/history',
  method: 'GET',
  rejectUnauthorized: false,
  headers: {
    'Authorization': 'Bearer test-token'
  }
};

https.get(httpsOptions, (res) => {
  console.log('HTTPS Status:', res.statusCode);
  console.log('HTTPS Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('HTTPS Response:', data);
    console.log('');
    
    // Test 2: Check database for routine records
    console.log('Test 2: Check database for routine records');
    const db = require('/app/data/database');
    
    try {
      const todayRecords = db.prepare('SELECT * FROM routine_records WHERE date = date("now", "localtime") LIMIT 5').all();
      console.log('Today routine records count:', todayRecords.length);
      console.log('Sample records:', JSON.stringify(todayRecords, null, 2));
      
      const allRecords = db.prepare('SELECT COUNT(*) as count FROM routine_records').get();
      console.log('Total routine records:', allRecords.count);
      
      const recentRecords = db.prepare('SELECT * FROM routine_records ORDER BY date DESC LIMIT 5').all();
      console.log('Recent records:', JSON.stringify(recentRecords, null, 2));
      
    } catch (error) {
      console.log('Database error:', error.message);
    }
    
    console.log('\n=== Diagnosis Complete ===');
  });
}).on('error', (err) => {
  console.log('HTTPS Error:', err.message);
  
  // Still try to check database
  console.log('\nTest 2: Check database for routine records');
  try {
    const db = require('/app/data/database');
    
    const todayRecords = db.prepare('SELECT * FROM routine_records WHERE date = date("now", "localtime") LIMIT 5').all();
    console.log('Today routine records count:', todayRecords.length);
    console.log('Sample records:', JSON.stringify(todayRecords, null, 2));
    
    const allRecords = db.prepare('SELECT COUNT(*) as count FROM routine_records').get();
    console.log('Total routine records:', allRecords.count);
    
    const recentRecords = db.prepare('SELECT * FROM routine_records ORDER BY date DESC LIMIT 5').all();
    console.log('Recent records:', JSON.stringify(recentRecords, null, 2));
    
  } catch (error) {
    console.log('Database error:', error.message);
  }
  
  console.log('\n=== Diagnosis Complete ===');
});
