const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

// Check if audit-log route already exists
if (content.includes('audit-log')) {
    console.log('ERROR: audit-log route already exists');
    process.exit(1);
}

// Audit log route (Pure ASCII with Unicode escape)
const auditLogRoute = `
// GET /approval/audit-log - Get audit history
router.get("/approval/audit-log", auth_1.authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Permission check: BOSS/MANAGER/SUPERVISOR only
        if (currentUser.role !== "BOSS" && currentUser.role !== "MANAGER" && currentUser.role !== "SUPERVISOR") {
            return res.status(403).json({ 
                success: false, 
                error: "\\u6c92\\u6709\\u6b0a\\u9650\\u67e5\\u770b\\u5be9\\u6838\\u6b77\\u53f2" 
            });
        }
        
        const { action, startDate, endDate, limit = 20, offset = 0 } = req.query;
        
        let query = "SELECT * FROM approval_audit_log WHERE 1=1";
        const params = [];
        
        // Filter: action type
        if (action && action !== "ALL") {
            query += " AND action = ?";
            params.push(action);
        }
        
        // Filter: start date
        if (startDate) {
            query += " AND DATE(created_at) >= DATE(?)";
            params.push(startDate);
        }
        
        // Filter: end date
        if (endDate) {
            query += " AND DATE(created_at) <= DATE(?)";
            params.push(endDate);
        }
        
        // Get total count
        const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
        const totalResult = req.db.prepare(countQuery).get(...params);
        const total = totalResult.total;
        
        // Get records with pagination
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        params.push(parseInt(limit), parseInt(offset));
        
        const logs = req.db.prepare(query).all(...params);
        
        res.json({
            success: true,
            logs: logs,
            total: total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        console.error("[Reports] Get audit log error:", error);
        res.status(500).json({ 
            success: false, 
            error: "\\u7cfb\\u7d71\\u932f\\u8aa4\\uff0c\\u7121\\u6cd5\\u8f09\\u5165\\u5be9\\u6838\\u6b77\\u53f2" 
        });
    }
});
`;

// Insert before the last route (/:id/logs)
const logsRouteIndex = content.lastIndexOf('router.get("/:id/logs"');
if (logsRouteIndex === -1) {
    console.log('ERROR: Cannot find /:id/logs route');
    process.exit(1);
}

content = content.slice(0, logsRouteIndex) + auditLogRoute + '\n' + content.slice(logsRouteIndex);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added audit-log API route to reports.js');
