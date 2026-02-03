const fs = require('fs');

console.log('=== Safe Fix: Report 7-Day Exemption ===\n');

const filePath = '/app/dist/routes/reports.js';
const backupPath = '/app/dist/routes/reports.js.backup-before-7day';

// Create backup
fs.copyFileSync(filePath, backupPath);
console.log('✅ Backup created:', backupPath);

let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix GET / route - Add 7-day filter
console.log('\n1. Modifying GET / route...');
const oldGetQuery = `let reports;
        if (currentUser.role === "EMPLOYEE") {
            console.log("[Reports] Employee query, filter user_id =", currentUser.id);
            reports = await db.all("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [currentUser.id]);
        } else {
            console.log("[Reports] Manager query, show all reports");
            reports = await db.all("SELECT * FROM reports ORDER BY created_at DESC LIMIT 50");
        }`;

const newGetQuery = `// 7-day exemption: Only show reports within 7 days
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
        }`;

if (content.includes(oldGetQuery)) {
    content = content.replace(oldGetQuery, newGetQuery);
    console.log('✅ GET route modified');
} else {
    console.log('⚠️  Exact pattern not found');
}

// 2. Fix PUT /:id route - Check ownership within 7 days
console.log('\n2. Modifying PUT /:id route...');
const putStart = content.indexOf('router.put("/:id"');
let putEnd = -1;

if (putStart > 0) {
    putEnd = content.indexOf('router.delete', putStart);
    if (putEnd < 0) putEnd = content.indexOf('router.get', putStart);
    
    let putSection = content.substring(putStart, putEnd);
    
    const afterCurrentUser = putSection.indexOf('const currentUser = req.user;');
    if (afterCurrentUser > 0) {
        const insertPos = putSection.indexOf('\n', afterCurrentUser) + 1;
        
        const ownershipCheck = `
        // Check ownership and 7-day rule
        const existingReport = await db.get("SELECT * FROM reports WHERE id = ?", [req.params.id]);
        if (!existingReport) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const reportAge = (new Date() - new Date(existingReport.created_at)) / (1000 * 60 * 60 * 24);
        const isOwnReport = existingReport.user_id === currentUser.id;
        const within7Days = reportAge <= 7;
        
        // Allow: own report within 7 days OR BOSS/MANAGER
        if (!(isOwnReport && within7Days) && currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
            return res.status(403).json({ error: 'Cannot edit reports older than 7 days' });
        }
`;
        
        putSection = putSection.slice(0, insertPos) + ownershipCheck + putSection.slice(insertPos);
        content = content.substring(0, putStart) + putSection + content.substring(putEnd);
        console.log('✅ PUT route modified');
    } else {
        console.log('⚠️  Could not find insertion point in PUT route');
    }
} else {
    console.log('⚠️  PUT route not found');
}

// 3. Fix DELETE /:id route - Check ownership within 7 days  
console.log('\n3. Modifying DELETE /:id route...');
const deleteStart = content.indexOf('router.delete("/:id"');

if (deleteStart > 0) {
    // Find the end of DELETE route
    let deleteEnd = content.indexOf('});', deleteStart);
    // Find the next router call after DELETE
    const nextRouter = content.indexOf('router.', deleteStart + 20);
    if (nextRouter > 0 && nextRouter < deleteEnd) {
        deleteEnd = nextRouter;
    }
    
    let deleteSection = content.substring(deleteStart, deleteEnd + 3);
    
    const afterCurrentUserDel = deleteSection.indexOf('const currentUser = req.user;');
    if (afterCurrentUserDel > 0) {
        const insertPos = deleteSection.indexOf('\n', afterCurrentUserDel) + 1;
        
        const deleteCheck = `
        // Check ownership and 7-day rule for deletion
        const reportToDelete = await db.get("SELECT * FROM reports WHERE id = ?", [req.params.id]);
        if (!reportToDelete) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const reportAgeDays = (new Date() - new Date(reportToDelete.created_at)) / (1000 * 60 * 60 * 24);
        const isOwnRpt = reportToDelete.user_id === currentUser.id;
        const within7d = reportAgeDays <= 7;
        
        // Allow: own report within 7 days OR BOSS/MANAGER
        if (!(isOwnRpt && within7d) && currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
            return res.status(403).json({ error: 'Cannot delete reports older than 7 days' });
        }
`;
        
        deleteSection = deleteSection.slice(0, insertPos) + deleteCheck + deleteSection.slice(insertPos);
        content = content.substring(0, deleteStart) + deleteSection + content.substring(deleteEnd + 3);
        console.log('✅ DELETE route modified');
    } else {
        console.log('⚠️  Could not find insertion point in DELETE route');
    }
} else {
    console.log('⚠️  DELETE route not found');
}

// Save modified file
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Fix Complete ===');
console.log('📦 Backup:', backupPath);
console.log('\nNext: Test syntax');
