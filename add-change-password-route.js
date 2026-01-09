const fs = require('fs');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到 reset-password 路由後面插入 change-password 路由
const insertPoint = content.indexOf("// GET /api/users/department/:departmentId");

if (insertPoint === -1) {
  console.log('ERROR: Could not find insertion point');
  process.exit(1);
}

const newRoute = `
// POST /api/users/:id/change-password - 修改自己的密碼
router.post('/:id/change-password', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    
    // 只能修改自己的密碼
    if (currentUser.id !== id) {
      return res.status(403).json({ error: '\\u53ea\\u80fd\\u4fee\\u6539\\u81ea\\u5df1\\u7684\\u5bc6\\u78bc' });
    }
    
    // 驗證輸入
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '\\u8acb\\u63d0\\u4f9b\\u820a\\u5bc6\\u78bc\\u548c\\u65b0\\u5bc6\\u78bc' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '\\u65b0\\u5bc6\\u78bc\\u81f3\\u5c11\\u9700\\u89816\\u500b\\u5b57\\u5143' });
    }
    
    // 獲取用戶
    const user = dbCall(db, 'prepare', 'SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: '\\u7528\\u6236\\u4e0d\\u5b58\\u5728' });
    }
    
    // 驗證舊密碼
    const isValidPassword = await verifyPassword(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '\\u820a\\u5bc6\\u78bc\\u4e0d\\u6b63\\u78ba' });
    }
    
    // 加密新密碼
    const hashedPassword = await hashPassword(newPassword);
    
    // 更新密碼
    dbCall(db, 'prepare', 'UPDATE users SET password = ?, updated_at = datetime(\\'now\\') WHERE id = ?').run(hashedPassword, id);
    
    res.json({ message: '\\u5bc6\\u78bc\\u4fee\\u6539\\u6210\\u529f' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});

`;

// 插入新路由
content = content.slice(0, insertPoint) + newRoute + content.slice(insertPoint);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: change-password route added');
