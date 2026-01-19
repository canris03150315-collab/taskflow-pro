const fs = require('fs');

console.log('=== Fixing Report GET Route for 7-Day Exemption ===\n');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find the GET / route
const getRouteStart = content.indexOf('router.get("/", auth_1.authenticateToken, async (req, res) => {');

if (getRouteStart === -1) {
  console.log('❌ GET route not found');
  process.exit(1);
}

console.log('✅ Found GET / route at position', getRouteStart);

// Find the SELECT statement in this route
const getRouteEnd = content.indexOf('router.post("/"', getRouteStart);
const getRouteSection = content.substring(getRouteStart, getRouteEnd);

console.log('GET route section length:', getRouteSection.length);

// Find where we select reports
const selectPattern = /const reports = [\s\S]*?;/;
const selectMatch = getRouteSection.match(selectPattern);

if (!selectMatch) {
  console.log('❌ Could not find reports selection statement');
  process.exit(1);
}

console.log('✅ Found reports selection statement');

const oldStatement = selectMatch[0];
console.log('Old statement:', oldStatement.substring(0, 100) + '...');

// Replace with new logic
const newStatement = `// 7-day exemption logic
    let reports;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();
    
    if (currentUser.role === 'EMPLOYEE') {
      // Employees: only own reports within 7 days
      reports = dbCall(db, 'all', \`
        SELECT * FROM reports 
        WHERE user_id = '\${currentUser.id}' 
        AND created_at > '\${sevenDaysAgoStr}'
        ORDER BY created_at DESC
      \`);
    } else if (currentUser.role === 'SUPERVISOR') {
      // Supervisors: department reports within 7 days
      reports = dbCall(db, 'all', \`
        SELECT r.* FROM reports r
        JOIN users u ON r.user_id = u.id
        WHERE u.department = '\${currentUser.department}'
        AND r.created_at > '\${sevenDaysAgoStr}'
        ORDER BY r.created_at DESC
      \`);
    } else {
      // BOSS/MANAGER: all reports within 7 days
      reports = dbCall(db, 'all', \`
        SELECT * FROM reports 
        WHERE created_at > '\${sevenDaysAgoStr}'
        ORDER BY created_at DESC
      \`);
    }`;

// Replace in the full content
const fullOldStatement = content.substring(
  content.indexOf(oldStatement, getRouteStart),
  content.indexOf(oldStatement, getRouteStart) + oldStatement.length
);

content = content.replace(fullOldStatement, newStatement);

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ GET route fixed successfully');
console.log('New logic:');
console.log('  - EMPLOYEE: See only own reports within 7 days');
console.log('  - SUPERVISOR: See department reports within 7 days');
console.log('  - BOSS/MANAGER: See all reports within 7 days');
console.log('  - Reports > 7 days: Need dual authorization to view');
