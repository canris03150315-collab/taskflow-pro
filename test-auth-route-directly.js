console.log('=== Testing Auth Route Directly ===\n');

try {
  console.log('[1/4] Loading database...');
  const Database = require('better-sqlite3');
  const db = new Database('/app/data/taskflow.db');
  console.log('OK Database loaded');
  console.log('');
  
  console.log('[2/4] Simulating /setup/check route logic...');
  const mockReq = { db: db };
  const mockRes = {
    json: (data) => {
      console.log('Response would be:', JSON.stringify(data, null, 2));
      return mockRes;
    },
    status: (code) => {
      console.log('Status code:', code);
      return mockRes;
    }
  };
  
  console.log('[3/4] Executing route handler...');
  try {
    const result = mockReq.db.prepare('SELECT COUNT(*) as count FROM users').get();
    mockRes.json({
      needsSetup: result.count === 0,
      userCount: result.count
    });
    console.log('OK Route executed successfully');
  } catch (routeError) {
    console.error('ERROR in route:', routeError.message);
    mockRes.status(500).json({ error: routeError.message });
  }
  console.log('');
  
  console.log('[4/4] Loading actual auth.js to check for syntax errors...');
  try {
    const authRoutes = require('/app/dist/routes/auth.js');
    console.log('OK auth.js loaded without syntax errors');
    console.log('Exported:', typeof authRoutes);
  } catch (loadError) {
    console.error('ERROR loading auth.js:', loadError.message);
    console.error('Stack:', loadError.stack);
  }
  
  db.close();
  console.log('');
  console.log('SUCCESS: Test complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
