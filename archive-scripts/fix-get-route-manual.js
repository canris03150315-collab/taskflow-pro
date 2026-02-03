const fs = require('fs');

console.log('=== Manual Fix: GET Route for 7-Day Filter ===\n');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find the GET route more precisely
const getRouteStart = content.indexOf('router.get("/", auth_1.authenticateToken, async (req, res) => {');
if (getRouteStart < 0) {
    console.log('❌ Cannot find GET route');
    process.exit(1);
}

console.log('✅ Found GET route at position', getRouteStart);

// Find the section to replace
const getRouteSection = content.substring(getRouteStart, getRouteStart + 2000);

// Look for the current query logic
if (getRouteSection.includes('currentUser.role === "EMPLOYEE"')) {
    console.log('✅ Found EMPLOYEE check');
    
    // Find exact boundaries
    const queryStart = getRouteSection.indexOf('let reports;');
    const queryEnd = getRouteSection.indexOf('console.log("[Reports] Query result count:"');
    
    if (queryStart > 0 && queryEnd > queryStart) {
        const oldQuery = getRouteSection.substring(queryStart, queryEnd);
        console.log('\nOld query found, length:', oldQuery.length);
        
        const newQuery = `// 7-day exemption: Only show reports within 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString();
        
        let reports;
        if (currentUser.role === "EMPLOYEE") {
            console.log("[Reports] Employee: own reports within 7 days");
            reports = await db.all(
                "SELECT * FROM reports WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC", 
                [currentUser.id, sevenDaysAgoStr]
            );
        } else if (currentUser.role === "SUPERVISOR") {
            console.log("[Reports] Supervisor: department reports within 7 days");
            reports = await db.all(\`
                SELECT r.* FROM reports r
                JOIN users u ON r.user_id = u.id
                WHERE u.department = ? AND r.created_at > ?
                ORDER BY r.created_at DESC
            \`, [currentUser.department, sevenDaysAgoStr]);
        } else {
            console.log("[Reports] BOSS/MANAGER: all reports within 7 days");
            reports = await db.all(
                "SELECT * FROM reports WHERE created_at > ? ORDER BY created_at DESC", 
                [sevenDaysAgoStr]
            );
        }
        
        `;
        
        // Replace in full content
        const fullOldQuery = content.substring(
            content.indexOf(oldQuery, getRouteStart),
            content.indexOf(oldQuery, getRouteStart) + oldQuery.length
        );
        
        content = content.replace(fullOldQuery, newQuery);
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('\n✅ GET route successfully modified!');
        console.log('Changes:');
        console.log('  - Added 7-day date calculation');
        console.log('  - EMPLOYEE: filters by user_id AND created_at > 7 days ago');
        console.log('  - SUPERVISOR: filters by department AND created_at > 7 days ago');
        console.log('  - BOSS/MANAGER: filters by created_at > 7 days ago');
    } else {
        console.log('❌ Could not find query boundaries');
    }
} else {
    console.log('❌ Could not find EMPLOYEE check in GET route');
}
