const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

// 檢查是否已經有 audit-log 路由
if (content.includes("router.get('/approval/audit-log'") || content.includes('audit-log')) {
    console.log('ERROR: audit-log route already exists');
    process.exit(1);
}

// 找到 router.get('/approval/pending' 的位置，在其後添加 audit-log 路由
const auditLogRoute = `
// Get audit log
router.get('/approval/audit-log', authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // \u6b0a\u9650\u6aa2\u67e5\uff1a\u53ea\u6709 BOSS/MANAGER/SUPERVISOR \u53ef\u4ee5\u67e5\u770b\u5be9\u6838\u6b77\u53f2
        if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
            return res.status(403).json({ 
                success: false, 
                error: '\u6c92\u6709\u6b0a\u9650\u67e5\u770b\u5be9\u6838\u6b77\u53f2' 
            });
        }
        
        const { action, startDate, endDate, limit = 20, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM approval_audit_log WHERE 1=1';
        const params = [];
        
        // \u7be9\u9078\uff1a\u64cd\u4f5c\u985e\u578b
        if (action && action !== 'ALL') {
            query += ' AND action = ?';
            params.push(action);
        }
        
        // \u7be9\u9078\uff1a\u958b\u59cb\u65e5\u671f
        if (startDate) {
            query += ' AND DATE(created_at) >= DATE(?)';
            params.push(startDate);
        }
        
        // \u7be9\u9078\uff1a\u7d50\u675f\u65e5\u671f
        if (endDate) {
            query += ' AND DATE(created_at) <= DATE(?)';
            params.push(endDate);
        }
        
        // \u67e5\u8a62\u7e3d\u6578
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const totalResult = req.db.prepare(countQuery).get(...params);
        const total = totalResult.total;
        
        // \u67e5\u8a62\u8a18\u9304\uff08\u5206\u9801\uff09
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
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
        console.error('Get audit log error:', error);
        res.status(500).json({ 
            success: false, 
            error: '\u7cfb\u7d71\u932f\u8aa4\uff0c\u7121\u6cd5\u8f09\u5165\u5be9\u6838\u6b77\u53f2' 
        });
    }
});
`;

// 在 module.exports 之前插入新路由
const exportIndex = content.lastIndexOf('module.exports');
if (exportIndex === -1) {
    console.log('ERROR: Cannot find module.exports');
    process.exit(1);
}

content = content.slice(0, exportIndex) + auditLogRoute + '\n' + content.slice(exportIndex);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added audit-log API route');
