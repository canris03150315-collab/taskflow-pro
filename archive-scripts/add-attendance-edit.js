const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 GET /status 路由之前添加 PUT /:id 編輯路由
const editRoute = `
// PUT /api/attendance/:id - 編輯打卡記錄（僅 BOSS 可用）
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { clock_in, clock_out, notes } = req.body;

    // 權限檢查：僅 BOSS 可編輯
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: '\\u53ea\\u6709\\u8001\\u95c6\\u53ef\\u4ee5\\u7de8\\u8f2f\\u6253\\u5361\\u8a18\\u9304' });
    }

    // 檢查記錄是否存在
    const existing = await db.get('SELECT * FROM attendance_records WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '\\u6253\\u5361\\u8a18\\u9304\\u4e0d\\u5b58\\u5728' });
    }

    // 計算工時
    let durationMinutes = existing.duration_minutes;
    if (clock_in && clock_out) {
      const clockInTime = new Date(clock_in);
      const clockOutTime = new Date(clock_out);
      durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60));
    }

    // 更新記錄
    await db.run(\`
      UPDATE attendance_records 
      SET clock_in = ?, clock_out = ?, duration_minutes = ?, notes = ?
      WHERE id = ?
    \`, [
      clock_in || existing.clock_in,
      clock_out || existing.clock_out,
      durationMinutes,
      notes !== undefined ? notes : existing.notes,
      id
    ]);

    // 獲取更新後的記錄
    const updated = await db.get('SELECT * FROM attendance_records WHERE id = ?', [id]);

    res.json({
      message: '\\u6253\\u5361\\u8a18\\u9304\\u5df2\\u66f4\\u65b0',
      record: updated
    });

  } catch (error) {
    console.error('\\u7de8\\u8f2f\\u6253\\u5361\\u8a18\\u9304\\u932f\\u8aa4:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});
`;

// 在 exports 之前插入編輯路由
const exportsIndex = content.lastIndexOf("exports.attendanceRoutes = router;");
if (exportsIndex === -1) {
  console.error('ERROR: Could not find exports statement');
  process.exit(1);
}

content = content.slice(0, exportsIndex) + editRoute + '\n' + content.slice(exportsIndex);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added attendance edit route');
