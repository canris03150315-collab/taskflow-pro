const fs = require('fs');
const path = require('path');

console.log('=== Starting feature restoration ===');

// 1. 恢復 users.js EMPLOYEE 權限檢查
console.log('\n1. Restoring EMPLOYEE permission check in users.js...');
const usersPath = '/app/dist/routes/users.js';
let usersContent = fs.readFileSync(usersPath, 'utf8');

// 在 SUPERVISOR 檢查之前添加 EMPLOYEE 權限檢查
const supervisorCheck = '        // SUPERVISOR \u53ea\u80fd\u770b\u5230\u81ea\u5df1\u90e8\u9580\u7684\u7528\u6236';
const employeeCheck = `
        // EMPLOYEE can only see users in their own department
        if (currentUser.role === 'EMPLOYEE') {
            query += ' WHERE department = ?';
            params.push(currentUser.department);
        }

        ${supervisorCheck}`;

if (usersContent.includes(supervisorCheck) && !usersContent.includes('EMPLOYEE can only see users')) {
    usersContent = usersContent.replace(supervisorCheck, employeeCheck);
    fs.writeFileSync(usersPath, usersContent, 'utf8');
    console.log('✅ EMPLOYEE permission check restored');
} else {
    console.log('ℹ️  EMPLOYEE check already exists or structure changed');
}

// 2. 恢復 attendance.js PUT 路由
console.log('\n2. Restoring attendance PUT route...');
const attendancePath = '/app/dist/routes/attendance.js';
let attendanceContent = fs.readFileSync(attendancePath, 'utf8');

// 檢查是否已有 PUT 路由
if (!attendanceContent.includes("router.put('/:id'")) {
    // 在文件末尾的 module.exports 之前添加 PUT 路由
    const putRoute = `

// PUT /api/attendance/:id - 編輯打卡記錄（只有 BOSS 可以）
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { clock_in, clock_out, notes } = req.body;

    // 驗證權限：只有 BOSS 可以編輯
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: '\u53ea\u6709\u8001\u95c6\u53ef\u4ee5\u7de8\u8f2f\u6253\u5361\u8a18\u9304' });
    }

    // 檢查記錄是否存在
    const existing = await db.get('SELECT * FROM attendance_records WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '\u6253\u5361\u8a18\u9304\u4e0d\u5b58\u5728' });
    }

    // 計算時長
    let durationMinutes = existing.duration_minutes;
    if (clock_in && clock_out) {
      const clockInTime = new Date(clock_in);
      const clockOutTime = new Date(clock_out);
      durationMinutes = Math.floor((clockOutTime - clockInTime) / (1000 * 60));
    }

    // 更新記錄
    await db.run(
      \`UPDATE attendance_records 
       SET clock_in = ?, clock_out = ?, duration_minutes = ?, notes = ?
       WHERE id = ?\`,
      [clock_in || existing.clock_in, clock_out || existing.clock_out, durationMinutes, notes || existing.notes, id]
    );

    res.json({ success: true, message: '\u6253\u5361\u8a18\u9304\u5df2\u66f4\u65b0' });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

`;
    
    const exportsLine = 'module.exports = router;';
    if (attendanceContent.includes(exportsLine)) {
        attendanceContent = attendanceContent.replace(exportsLine, putRoute + exportsLine);
        fs.writeFileSync(attendancePath, attendanceContent, 'utf8');
        console.log('✅ Attendance PUT route restored');
    } else {
        console.log('⚠️  Could not find exports line in attendance.js');
    }
} else {
    console.log('ℹ️  PUT route already exists');
}

// 3. 註冊 AI 助理路由到 server.js
console.log('\n3. Registering AI assistant route in server.js...');
const serverPath = '/app/dist/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

if (!serverContent.includes("'/api/ai-assistant'")) {
    const backupRoute = "this.app.use('/api/backup', require('./routes/backup'));";
    const aiRoute = "        this.app.use('/api/ai-assistant', require('./routes/ai-assistant'));\n        " + backupRoute;
    
    if (serverContent.includes(backupRoute)) {
        serverContent = serverContent.replace(backupRoute, aiRoute);
        fs.writeFileSync(serverPath, serverContent, 'utf8');
        console.log('✅ AI assistant route registered');
    } else {
        console.log('⚠️  Could not find backup route in server.js');
    }
} else {
    console.log('ℹ️  AI assistant route already registered');
}

console.log('\n=== Feature restoration complete ===');
console.log('\nNote: ai-assistant.js, routines.js, and schedules.js need to be copied separately');
