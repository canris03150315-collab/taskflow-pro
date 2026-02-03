const fs = require('fs');
const path = require('path');

console.log('=== Testing /parse Endpoint Execution ===\n');

console.log('Step 1: Loading platform-revenue.js module...\n');

try {
  // Change to app directory
  process.chdir('/app');
  
  // Mock dependencies
  const express = require('express');
  const app = express();
  
  // Mock database
  const Database = require('better-sqlite3');
  const db = new Database('/app/data/taskflow.db');
  
  // Mock request object
  const mockReq = {
    db: db,
    user: { id: 'test-user', role: 'BOSS' },
    file: {
      buffer: Buffer.from('test'),
      originalname: 'test.xlsx'
    }
  };
  
  const mockRes = {
    status: function(code) {
      console.log('Response status:', code);
      return this;
    },
    json: function(data) {
      console.log('Response data:', JSON.stringify(data, null, 2));
      return this;
    }
  };
  
  console.log('Step 2: Testing parseExcelFile function...\n');
  
  // Try to load and execute parseExcelFile
  const routeContent = fs.readFileSync('/app/dist/routes/platform-revenue.js', 'utf8');
  
  // Check if parseExcelDate is defined
  if (!routeContent.includes('function parseExcelDate')) {
    console.log('❌ ERROR: parseExcelDate function is missing!');
    console.log('\nThis is likely the cause of the 500 error.');
    console.log('parseExcelFile calls parseExcelDate but it is not defined.');
  } else {
    console.log('✅ parseExcelDate function exists');
  }
  
  // Check for other helper functions
  const helperFunctions = ['parseExcelDate', 'dbCall'];
  console.log('\nChecking helper functions:');
  helperFunctions.forEach(func => {
    const exists = routeContent.includes(`function ${func}`) || routeContent.includes(`const ${func}`);
    console.log(`- ${func}: ${exists ? '✅' : '❌'}`);
  });
  
  db.close();
  
} catch (error) {
  console.error('Error during test:', error.message);
  console.error('Stack:', error.stack);
}

console.log('\n=== Test Complete ===');
