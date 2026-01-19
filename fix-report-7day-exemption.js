const fs = require('fs');

console.log('=== Fixing Report 7-Day Exemption ===\n');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

// Helper function to check if report is within 7 days
const helperFunction = `
// Helper: Check if report is within 7 days
const isWithin7Days = (createdAt) => {
  const reportDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now - reportDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
};
`;

// 1. Add helper function after imports
const afterImports = content.indexOf('const router = express_1.Router();');
if (afterImports !== -1) {
  const insertPos = content.indexOf('\n', afterImports) + 1;
  content = content.slice(0, insertPos) + helperFunction + content.slice(insertPos);
  console.log('✅ Added helper function');
}

// 2. Modify GET / route
// Find the GET route and modify the query logic
const getRoutePattern = /router\.get\("\/", auth_1\.authenticateToken, async \(req, res\) => {[\s\S]*?const db = req\.db;[\s\S]*?const currentUser = req\.user;/;
const getRouteMatch = content.match(getRoutePattern);

if (getRouteMatch) {
  // Find the SELECT statement in GET route
  const selectPattern = /const reports = dbCall\(db, 'all', `[\s\S]*?SELECT \* FROM reports[\s\S]*?`\);/;
  const selectMatch = content.match(selectPattern);
  
  if (selectMatch) {
    const oldSelect = selectMatch[0];
    
    // New logic: Allow viewing own reports within 7 days
    const newSelect = `// Allow viewing own reports within 7 days without authorization
    let reports;
    if (currentUser.role === 'EMPLOYEE') {
      // Employees can only see their own reports within 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      reports = dbCall(db, 'all', \`
        SELECT * FROM reports 
        WHERE user_id = '\${currentUser.id}' 
        AND created_at > '\${sevenDaysAgo.toISOString()}'
        ORDER BY created_at DESC
      \`);
    } else if (currentUser.role === 'SUPERVISOR') {
      // Supervisors can see their department's reports within 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      reports = dbCall(db, 'all', \`
        SELECT r.* FROM reports r
        JOIN users u ON r.user_id = u.id
        WHERE u.department = '\${currentUser.department}'
        AND r.created_at > '\${sevenDaysAgo.toISOString()}'
        ORDER BY r.created_at DESC
      \`);
    } else {
      // BOSS/MANAGER can see all reports within 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      reports = dbCall(db, 'all', \`
        SELECT * FROM reports 
        WHERE created_at > '\${sevenDaysAgo.toISOString()}'
        ORDER BY created_at DESC
      \`);
    }`;
    
    content = content.replace(oldSelect, newSelect);
    console.log('✅ Modified GET / route - 7-day exemption logic added');
  }
}

// 3. Modify PUT /:id route - Allow editing own reports within 7 days
const putRouteStart = content.indexOf('router.put("/:id"');
if (putRouteStart !== -1) {
  // Find the authorization check in PUT route
  const putSection = content.substring(putRouteStart, putRouteStart + 2000);
  
  // Add check before existing authorization logic
  const checkPattern = /const currentUser = req\.user;/;
  const checkMatch = putSection.match(checkPattern);
  
  if (checkMatch) {
    const insertAfter = content.indexOf(checkMatch[0], putRouteStart) + checkMatch[0].length;
    
    const ownershipCheck = `
        
        // Check if this is user's own report within 7 days
        const report = dbCall(db, 'get', \`SELECT * FROM reports WHERE id = '\${req.params.id}'\`);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const isOwnReport = report.user_id === currentUser.id;
        const within7Days = isWithin7Days(report.created_at);
        
        // Allow editing if: own report within 7 days
        if (isOwnReport && within7Days) {
            // Proceed with update without authorization check
        } else if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
            // For reports > 7 days old, only BOSS/MANAGER can edit
            return res.status(403).json({ error: 'Cannot edit reports older than 7 days' });
        }`;
    
    content = content.slice(0, insertAfter) + ownershipCheck + content.slice(insertAfter);
    console.log('✅ Modified PUT /:id route - 7-day ownership check added');
  }
}

// 4. Modify DELETE /:id route - Allow deleting own reports within 7 days
const deleteRouteStart = content.indexOf('router.delete("/:id"');
if (deleteRouteStart !== -1) {
  const deleteSection = content.substring(deleteRouteStart, deleteRouteStart + 1500);
  
  const deleteCheckPattern = /const currentUser = req\.user;/;
  const deleteCheckMatch = deleteSection.match(deleteCheckPattern);
  
  if (deleteCheckMatch) {
    const insertAfter = content.indexOf(deleteCheckMatch[0], deleteRouteStart) + deleteCheckMatch[0].length;
    
    const deleteOwnershipCheck = `
        
        // Check if this is user's own report within 7 days
        const report = dbCall(db, 'get', \`SELECT * FROM reports WHERE id = '\${req.params.id}'\`);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const isOwnReport = report.user_id === currentUser.id;
        const within7Days = isWithin7Days(report.created_at);
        
        // Allow deleting if: own report within 7 days OR BOSS/MANAGER
        if (!(isOwnReport && within7Days) && currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
            return res.status(403).json({ error: 'Cannot delete reports older than 7 days' });
        }`;
    
    content = content.slice(0, insertAfter) + deleteOwnershipCheck + content.slice(insertAfter);
    console.log('✅ Modified DELETE /:id route - 7-day ownership check added');
  }
}

// Save the modified file
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Fix Complete ===');
console.log('Summary:');
console.log('  - GET /: Returns own reports within 7 days (no auth needed)');
console.log('  - PUT /:id: Allows editing own reports within 7 days');
console.log('  - DELETE /:id: Allows deleting own reports within 7 days');
console.log('  - Reports > 7 days old: Requires dual authorization');
