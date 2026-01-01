import express from 'express';
import bcrypt from 'bcrypt';
import { Database } from '../database';
import { User, Role } from '../types';
import { logSystemAction } from '../utils/logger';
import { authenticateToken, requireRole, requireSelfOrAdmin, requireDepartmentAccess } from '../middleware/auth';

const router = express.Router();

// 密碼加密
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// GET /api/users - 獲取用戶列表（需要管理員權限）
router.get('/', authenticateToken, requireRole([Role.BOSS, Role.MANAGER, Role.SUPERVISOR]), async (req, res) => {
  try {
    const db = req.db!;
    const currentUser = req.user!;

    let query = 'SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users';
    let params: any[] = [];

    // SUPERVISOR 只能看到自己部門的用戶
    if (currentUser.role === Role.SUPERVISOR) {
      query += ' WHERE department = ?';
      params.push(currentUser.department);
    }

    query += ' ORDER BY role DESC, name ASC';

    const users = await db.all(query, params);
    
    // 解析 permissions 欄位
    const usersWithPermissions = users.map(user => ({
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : undefined
    }));

    res.json(usersWithPermissions);
  } catch (error) {
    console.error('獲取用戶列表錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/users/:id - 獲取特定用戶資訊
router.get('/:id', authenticateToken, requireSelfOrAdmin('id'), async (req, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;

    const userRow = await db.get(
      'SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (!userRow) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    const user = {
      ...userRow,
      permissions: userRow.permissions ? JSON.parse(userRow.permissions) : undefined
    };

    res.json(user);
  } catch (error) {
    console.error('獲取用戶資訊錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/users - 創建新用戶（需要管理員權限）
router.post('/', authenticateToken, requireRole([Role.BOSS, Role.MANAGER]), async (req, res) => {
  try {
    const db = req.db!;
    const currentUser = req.user!;
    const { name, username, password, role, department, avatar, permissions } = req.body;

    // 驗證必要欄位
    if (!name || !username || !password || !role || !department) {
      return res.status(400).json({ 
        error: '請提供完整的用戶資訊（姓名、用戶名、密碼、角色、部門）' 
      });
    }

    // 驗證角色
    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ error: '無效的用戶角色' });
    }

    // 只有 BOSS 可以創建 BOSS 角色用戶
    if (role === Role.BOSS && currentUser.role !== Role.BOSS) {
      return res.status(403).json({ error: '只有 BOSS 可以創建 BOSS 角色用戶' });
    }

    // MANAGER 不能創建其他 MANAGER
    if (role === Role.MANAGER && currentUser.role !== Role.BOSS) {
      return res.status(403).json({ error: '只有 BOSS 可以創建 MANAGER 角色用戶' });
    }

    // 檢查用戶名是否已存在
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 檢查部門是否存在
    const deptExists = await db.get(
      'SELECT id FROM departments WHERE id = ?',
      [department]
    );

    if (!deptExists) {
      return res.status(400).json({ error: '指定的部門不存在' });
    }

    // 加密密碼
    const hashedPassword = await hashPassword(password);

    // 生成用戶 ID
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 插入用戶
    await db.run(
      `INSERT INTO users (id, name, role, department, avatar, username, password, permissions, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        userId,
        name,
        role,
        department,
        avatar || '',
        username,
        hashedPassword,
        permissions ? JSON.stringify(permissions) : null
      ]
    );

    // 記錄日誌
    const newUser: User = {
      id: userId,
      name,
      role,
      department,
      avatar: avatar || '',
      username,
      password: hashedPassword,
      permissions
    };

    await logSystemAction(db, currentUser, 'CREATE_USER', `創建用戶: ${name} (${username})`);

    // 返回創建的用戶資訊（不包含密碼）
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      user: userWithoutPassword,
      message: '用戶創建成功'
    });

  } catch (error) {
    console.error('創建用戶錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// PUT /api/users/:id - 更新用戶資訊
router.put('/:id', authenticateToken, requireSelfOrAdmin('id'), async (req, res) => {
  try {
    const db = req.db!;
    const currentUser = req.user!;
    const { id } = req.params;
    const { name, role, department, avatar, permissions } = req.body;

    // 獲取現有用戶
    const existingUser = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!existingUser) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 權限檢查
    const isSelf = currentUser.id === id;
    
    // 更新自己的資訊只能修改 name 和 avatar
    if (isSelf) {
      if (role || department || permissions) {
        return res.status(403).json({ error: '無權修改自己的角色、部門或權限' });
      }
    } else {
      // 管理員修改其他用戶的權限檢查
      if (role && !Object.values(Role).includes(role)) {
        return res.status(400).json({ error: '無效的用戶角色' });
      }

      if (role === Role.BOSS && currentUser.role !== Role.BOSS) {
        return res.status(403).json({ error: '只有 BOSS 可以設定 BOSS 角色' });
      }

      if (role === Role.MANAGER && currentUser.role !== Role.BOSS) {
        return res.status(403).json({ error: '只有 BOSS 可以設定 MANAGER 角色' });
      }
    }

    // 構建更新語句
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (role !== undefined && !isSelf) {
      updates.push('role = ?');
      params.push(role);
    }

    if (department !== undefined && !isSelf) {
      // 檢查部門是否存在
      const deptExists = await db.get(
        'SELECT id FROM departments WHERE id = ?',
        [department]
      );

      if (!deptExists) {
        return res.status(400).json({ error: '指定的部門不存在' });
      }

      updates.push('department = ?');
      params.push(department);
    }

    if (avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(avatar);
    }

    if (permissions !== undefined && !isSelf) {
      updates.push('permissions = ?');
      params.push(JSON.stringify(permissions));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '沒有需要更新的欄位' });
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(id);

    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 記錄日誌
    const action = isSelf ? 'UPDATE_SELF' : 'UPDATE_USER';
    const details = isSelf 
      ? `更新個人資訊: ${name || existingUser.name}`
      : `更新用戶: ${existingUser.name} (${existingUser.username})`;

    await logSystemAction(db, currentUser, action, details);

    // 獲取更新後的用戶資訊
    const updatedUser = await db.get(
      'SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    const userWithPermissions = {
      ...updatedUser,
      permissions: updatedUser.permissions ? JSON.parse(updatedUser.permissions) : undefined
    };

    res.json({
      user: userWithPermissions,
      message: '用戶資訊更新成功'
    });

  } catch (error) {
    console.error('更新用戶錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// DELETE /api/users/:id - 刪除用戶（需要 BOSS 或 MANAGER 權限）
router.delete('/:id', authenticateToken, requireRole([Role.BOSS, Role.MANAGER]), async (req, res) => {
  try {
    const db = req.db!;
    const currentUser = req.user!;
    const { id } = req.params;

    // 不能刪除自己
    if (currentUser.id === id) {
      return res.status(400).json({ error: '不能刪除自己的帳號' });
    }

    // 獲取要刪除的用戶
    const userToDelete = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!userToDelete) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 權限檢查
    if (currentUser.role === Role.MANAGER) {
      // MANAGER 不能刪除 BOSS 或其他 MANAGER
      if (userToDelete.role === Role.BOSS || userToDelete.role === Role.MANAGER) {
        return res.status(403).json({ error: '無權刪除該用戶' });
      }
    }

    // 檢查是否有相關聯的數據（任務、出勤記錄等）
    const taskCount = await db.get(
      'SELECT COUNT(*) as count FROM tasks WHERE assigned_to_user_id = ? OR created_by = ?',
      [id, id]
    );

    const attendanceCount = await db.get(
      'SELECT COUNT(*) as count FROM attendance_records WHERE user_id = ?',
      [id]
    );

    if (taskCount.count > 0 || attendanceCount.count > 0) {
      return res.status(400).json({ 
        error: '該用戶有相關聯的數據（任務或出勤記錄），無法刪除。建議停用帳號而非刪除。' 
      });
    }

    // 刪除用戶
    await db.run('DELETE FROM users WHERE id = ?', [id]);

    // 記錄日誌
    await logSystemAction(db, currentUser, 'DELETE_USER', `刪除用戶: ${userToDelete.name} (${userToDelete.username})`);

    res.json({ message: '用戶刪除成功' });

  } catch (error) {
    console.error('刪除用戶錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/users/:id/reset-password - 重置用戶密碼（需要管理員權限）
router.post('/:id/reset-password', authenticateToken, requireRole([Role.BOSS, Role.MANAGER]), async (req, res) => {
  try {
    const db = req.db!;
    const currentUser = req.user!;
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '新密碼長度至少需要 6 個字元' });
    }

    // 不能重置自己的密碼（應該用 change-password）
    if (currentUser.id === id) {
      return res.status(400).json({ error: '請使用修改密碼功能更新自己的密碼' });
    }

    // 獲取目標用戶
    const targetUser = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!targetUser) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 權限檢查
    if (currentUser.role === Role.MANAGER) {
      // MANAGER 不能重置 BOSS 或其他 MANAGER 的密碼
      if (targetUser.role === Role.BOSS || targetUser.role === Role.MANAGER) {
        return res.status(403).json({ error: '無權重設該用戶密碼' });
      }
    }

    // 加密新密碼
    const hashedPassword = await hashPassword(newPassword);

    // 更新密碼
    await db.run(
      'UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [hashedPassword, id]
    );

    // 記錄日誌
    await logSystemAction(db, currentUser, 'RESET_PASSWORD', `重置用戶密碼: ${targetUser.name} (${targetUser.username})`);

    res.json({ message: '密碼重置成功' });

  } catch (error) {
    console.error('重置密碼錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/users/department/:departmentId - 獲取部門用戶
router.get('/department/:departmentId', authenticateToken, requireDepartmentAccess('departmentId'), async (req, res) => {
  try {
    const db = req.db!;
    const { departmentId } = req.params;

    const users = await db.all(
      'SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users WHERE department = ? ORDER BY role DESC, name ASC',
      [departmentId]
    );

    const usersWithPermissions = users.map(user => ({
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : undefined
    }));

    res.json(usersWithPermissions);
  } catch (error) {
    console.error('獲取部門用戶錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/users/:id/avatar - 上傳頭像 (base64)
router.post('/:id/avatar', authenticateToken, requireSelfOrAdmin('id'), async (req, res) => {
  try {
    const db = req.db!;
    const currentUser = req.user!;
    const { id } = req.params;
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ error: '沒有提供頭像數據' });
    }

    // 驗證 base64 格式
    if (!avatar.startsWith('data:image/')) {
      return res.status(400).json({ error: '頭像格式錯誤，請提供有效的圖片' });
    }

    // 檢查 base64 大小（限制 5MB）
    const base64Data = avatar.split(',')[1];
    if (base64Data && Buffer.byteLength(base64Data, 'base64') > 5 * 1024 * 1024) {
      return res.status(400).json({ error: '頭像檔案過大，請選擇小於 5MB 的圖片' });
    }

    // 更新用戶頭像
    await db.run(
      'UPDATE users SET avatar = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [avatar, id]
    );

    // 記錄日誌
    await logSystemAction(db, currentUser, 'UPDATE_AVATAR', `更新用戶頭像: ${id}`);

    res.json({
      message: '頭像更新成功',
      avatar: avatar
    });

  } catch (error) {
    console.error('頭像上傳錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

export { router as userRoutes };
