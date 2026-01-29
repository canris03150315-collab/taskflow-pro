const fs = require('fs');

const schedulesPath = '/app/dist/routes/schedules.js';
let content = fs.readFileSync(schedulesPath, 'utf8');

// Find the position to insert the DELETE route (before exports.schedulesRoutes)
const exportIndex = content.lastIndexOf('exports.schedulesRoutes');

if (exportIndex === -1) {
  console.log('ERROR: Cannot find exports.schedulesRoutes');
  process.exit(1);
}

// DELETE route with Pure ASCII (Unicode Escape for Chinese)
const deleteRoute = `
// DELETE /:id - \u8edf\u522a\u9664\u6392\u73ed
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        
        // 1. \u67e5\u8a62\u6392\u73ed\u8a18\u9304
        const schedule = dbCall(db, 'prepare', 'SELECT * FROM schedules WHERE id = ?').get(id);
        
        if (!schedule) {
            return res.status(404).json({ error: '\u6392\u73ed\u4e0d\u5b58\u5728' });
        }
        
        // 2. \u6b0a\u9650\u6aa2\u67e5
        const canDelete = 
            schedule.user_id === currentUser.id || // \u81ea\u5df1\u7684\u6392\u73ed
            currentUser.role === 'BOSS' || // BOSS
            (currentUser.role === 'SUPERVISOR' && schedule.department_id === currentUser.department) ||
            (currentUser.role === 'MANAGER' && schedule.department_id === currentUser.department);
        
        if (!canDelete) {
            return res.status(403).json({ error: '\u7121\u6b0a\u522a\u9664\u6b64\u6392\u73ed' });
        }
        
        // 3. \u72c0\u614b\u6aa2\u67e5\uff08\u53ea\u80fd\u522a\u9664\u5df2\u6279\u51c6\u7684\uff09
        if (schedule.status !== 'APPROVED') {
            return res.status(400).json({ error: '\u53ea\u80fd\u522a\u9664\u5df2\u6279\u51c6\u7684\u6392\u73ed' });
        }
        
        // 4. \u6642\u9593\u6aa2\u67e5\uff08\u53ea\u80fd\u522a\u9664\u672a\u4f86\u7684\uff09
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const scheduleMonth = new Date(schedule.year, schedule.month - 1, 1);
        
        if (scheduleMonth < currentMonth) {
            return res.status(400).json({ error: '\u7121\u6cd5\u522a\u9664\u904e\u53bb\u7684\u6392\u73ed' });
        }
        
        // 5. \u8edf\u522a\u9664\uff08\u6539\u70ba CANCELLED\uff09
        const now_iso = new Date().toISOString();
        dbCall(db, 'prepare', 'UPDATE schedules SET status = ?, updated_at = ? WHERE id = ?')
            .run('CANCELLED', now_iso, id);
        
        // 6. \u8a18\u9304\u65e5\u8a8c
        dbCall(db, 'logAction', currentUser.id, currentUser.name, 'DELETE_SCHEDULE', 
            \`\u522a\u9664\u6392\u73ed: \${schedule.year}\u5e74\${schedule.month}\u6708\`, 'INFO');
        
        console.log(\`Schedule deleted: \${id} by \${currentUser.name}\`);
        res.json({ success: true, message: '\u6392\u73ed\u5df2\u522a\u9664' });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ error: error.message || '\u522a\u9664\u5931\u6557' });
    }
});

`;

// Insert the DELETE route before module.exports
content = content.slice(0, exportIndex) + deleteRoute + '\n' + content.slice(exportIndex);

// Write back
fs.writeFileSync(schedulesPath, content, 'utf8');
console.log('SUCCESS: DELETE route added to schedules.js');
