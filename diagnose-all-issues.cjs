const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Comprehensive Diagnosis ===\n');

const issues = [];

try {
  // Check 1: Database connection
  console.log('1. Checking database connection...');
  try {
    const testQuery = db.prepare('SELECT 1 as test').get();
    if (testQuery.test === 1) {
      console.log('   OK - Database connected');
    }
  } catch (error) {
    issues.push({
      id: 1,
      type: 'DATABASE',
      message: 'Database connection failed',
      error: error.message
    });
    console.log('   ERROR - Database connection failed:', error.message);
  }

  // Check 2: Users table exists
  console.log('2. Checking users table...');
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (tableCheck) {
      console.log('   OK - Users table exists');
      
      // Check user count
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      console.log(`   INFO - Total users: ${userCount.count}`);
      
      if (userCount.count === 0) {
        issues.push({
          id: 2,
          type: 'DATA',
          message: 'No users in database - system needs initialization',
          error: 'Empty users table'
        });
        console.log('   WARNING - No users found');
      }
    } else {
      issues.push({
        id: 3,
        type: 'SCHEMA',
        message: 'Users table does not exist',
        error: 'Missing table'
      });
      console.log('   ERROR - Users table missing');
    }
  } catch (error) {
    issues.push({
      id: 4,
      type: 'SCHEMA',
      message: 'Failed to check users table',
      error: error.message
    });
    console.log('   ERROR - Table check failed:', error.message);
  }

  // Check 3: Platform revenue tables
  console.log('3. Checking platform_transactions table...');
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_transactions'").get();
    if (tableCheck) {
      console.log('   OK - platform_transactions table exists');
      
      // Check column count
      const columns = db.prepare('PRAGMA table_info(platform_transactions)').all();
      console.log(`   INFO - Total columns: ${columns.length}`);
      
      // Check for detailed columns
      const detailedColumns = ['lottery_wage', 'lottery_rebate', 'game_ag', 'game_chess'];
      const existingDetailedCols = columns.filter(c => detailedColumns.includes(c.name));
      console.log(`   INFO - Detailed columns found: ${existingDetailedCols.length}/4`);
      
      if (existingDetailedCols.length === 0) {
        console.log('   WARNING - Detailed columns not found (migration may not have run)');
      }
    } else {
      console.log('   INFO - platform_transactions table does not exist (not critical)');
    }
  } catch (error) {
    console.log('   ERROR - Failed to check platform_transactions:', error.message);
  }

  // Check 4: Auth route functionality
  console.log('4. Checking auth setup status...');
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const needsSetup = userCount.count === 0;
    console.log(`   INFO - Needs setup: ${needsSetup}`);
    console.log(`   INFO - User count: ${userCount.count}`);
  } catch (error) {
    issues.push({
      id: 5,
      type: 'AUTH',
      message: 'Failed to check auth setup status',
      error: error.message
    });
    console.log('   ERROR - Auth check failed:', error.message);
  }

  // Check 5: Database file permissions
  console.log('5. Checking database file...');
  const fs = require('fs');
  try {
    const stats = fs.statSync('/app/data/taskflow.db');
    console.log(`   INFO - Database size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   OK - Database file accessible`);
  } catch (error) {
    issues.push({
      id: 6,
      type: 'FILE',
      message: 'Database file not accessible',
      error: error.message
    });
    console.log('   ERROR - Database file check failed:', error.message);
  }

  // Check 6: Route file syntax
  console.log('6. Checking route files...');
  try {
    require('/app/dist/routes/auth');
    console.log('   OK - auth.js loads successfully');
  } catch (error) {
    issues.push({
      id: 7,
      type: 'ROUTE',
      message: 'Auth route file has errors',
      error: error.message
    });
    console.log('   ERROR - auth.js failed to load:', error.message);
  }

  try {
    require('/app/dist/routes/platform-revenue');
    console.log('   OK - platform-revenue.js loads successfully');
  } catch (error) {
    issues.push({
      id: 8,
      type: 'ROUTE',
      message: 'Platform revenue route file has errors',
      error: error.message
    });
    console.log('   ERROR - platform-revenue.js failed to load:', error.message);
  }

} catch (error) {
  issues.push({
    id: 99,
    type: 'CRITICAL',
    message: 'Diagnosis script failed',
    error: error.message
  });
  console.log('CRITICAL ERROR:', error.message);
} finally {
  db.close();
}

console.log('\n=== Diagnosis Summary ===');
console.log(`Total issues found: ${issues.length}`);

if (issues.length > 0) {
  console.log('\nIssues:');
  issues.forEach(issue => {
    console.log(`  [${issue.id}] ${issue.type}: ${issue.message}`);
    console.log(`      Error: ${issue.error}`);
  });
} else {
  console.log('No issues found - system should be working');
}

console.log('\n=== End Diagnosis ===');
process.exit(issues.length > 0 ? 1 : 0);
