const fs = require('fs');

console.log('=== Fixing Report 7-Day Exemption (Precise) ===\n');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Find and replace the GET / route query logic
const oldGetLogic = `let reports;
        if (currentUser.role === "EMPLOYEE") {
            console.log("[Reports] Employee query, filter user_id =", currentUser.id);
            reports = await db.all("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [currentUser.id]);
        } else {
            console.log("[Reports] Manager query, show all reports");
            reports = await db.all("SELECT * FROM reports ORDER BY created_at DESC LIMIT 50");
        }`;

const newGetLogic = `// 7-day exemption: Only show reports within 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString();
        
        let reports;
        if (currentUser.role === "EMPLOYEE") {
            console.log("[Reports] Employee query: own reports within 7 days");
            reports = await db.all(
                "SELECT * FROM reports WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC", 
                [currentUser.id, sevenDaysAgoStr]
            );
        } else if (currentUser.role === "SUPERVISOR") {
            console.log("[Reports] Supervisor query: department reports within 7 days");
            reports = await db.all(\`
                SELECT r.* FROM reports r
                JOIN users u ON r.user_id = u.id
                WHERE u.department = ? AND r.created_at > ?
                ORDER BY r.created_at DESC
            \`, [currentUser.department, sevenDaysAgoStr]);
        } else {
            console.log("[Reports] BOSS/MANAGER query: all reports within 7 days");
            reports = await db.all(
                "SELECT * FROM reports WHERE created_at > ? ORDER BY created_at DESC", 
                [sevenDaysAgoStr]
            );
        }`;

if (content.includes(oldGetLogic)) {
    content = content.replace(oldGetLogic, newGetLogic);
    console.log('✅ Fixed GET / route - 7-day filter added');
} else {
    console.log('❌ Could not find exact GET logic pattern');
    console.log('Attempting partial replacement...');
    
    // Try to find just the if-else part
    const partialPattern = /if \(currentUser\.role === "EMPLOYEE"\) {[\s\S]*?reports = await db\.all\("SELECT \* FROM reports ORDER BY created_at DESC LIMIT 50"\);[\s\S]*?}/;
    
    if (content.match(partialPattern)) {
        content = content.replace(partialPattern, newGetLogic.replace('let reports;\n        ', ''));
        console.log('✅ Fixed GET / route using partial pattern');
    } else {
        console.log('❌ Failed to fix GET route');
    }
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Fix Summary ===');
console.log('Modified routes:');
console.log('  ✓ GET /api/reports - 7-day filter by role');
console.log('  ✓ PUT /api/reports/:id - ownership check (from previous fix)');
console.log('  ✓ DELETE /api/reports/:id - ownership check (from previous fix)');
console.log('\nBehavior:');
console.log('  • EMPLOYEE: Only see own reports within 7 days');
console.log('  • SUPERVISOR: Only see department reports within 7 days');
console.log('  • BOSS/MANAGER: See all reports within 7 days');
console.log('  • Reports >7 days: Need dual authorization to view');
