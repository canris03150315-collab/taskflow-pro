const fs = require('fs');

console.log('=== 修正 UserService ===');

const filePath = '/app/services/userService.js';

// 創建新的 UserService，使用靜態方法接受 db 實例
const newContent = `class UserService {
  // 獲取所有用戶（支持權限過濾）
  static async getAllUsers(db, currentUser) {
    let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';
    let params = [];
    
    // 所有角色都可以看到所有用戶
    const users = await db.all(query, params);
    
    // 解析 permissions 欄位
    return users.map(user => ({
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : undefined
    }));
  }

  // 根據 ID 獲取用戶
  static async getUserById(db, id) {
    const userRow = await db.get(
      'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    
    if (!userRow) {
      return null;
    }
    
    return {
      ...userRow,
      permissions: userRow.permissions ? JSON.parse(userRow.permissions) : undefined
    };
  }

  // 根據部門 ID 獲取用戶
  static async getUsersByDepartment(db, departmentId) {
    const users = await db.all(
      'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE department = ? ORDER BY role DESC, name ASC',
      [departmentId]
    );
    
    return users.map(user => ({
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : undefined
    }));
  }

  // 創建新用戶
  static async createUser(db, userData) {
    const { name, username, password, role, department, avatar, permissions } = userData;
    const id = \`user-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    const now = new Date().toISOString();
    
    await db.run(
      \`INSERT INTO users (id, name, role, department, avatar, username, password, permissions, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        id,
        name,
        role,
        department,
        avatar || null,
        username,
        password,
        permissions ? JSON.stringify(permissions) : null,
        now,
        now
      ]
    );
    
    return this.getUserById(db, id);
  }

  // 更新用戶
  static async updateUser(db, id, userData) {
    const updates = [];
    const params = [];
    
    if (userData.name !== undefined) {
      updates.push('name = ?');
      params.push(userData.name);
    }
    if (userData.role !== undefined) {
      updates.push('role = ?');
      params.push(userData.role);
    }
    if (userData.department !== undefined) {
      updates.push('department = ?');
      params.push(userData.department);
    }
    if (userData.avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(userData.avatar);
    }
    if (userData.permissions !== undefined) {
      updates.push('permissions = ?');
      params.push(JSON.stringify(userData.permissions));
    }
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    
    await db.run(
      \`UPDATE users SET \${updates.join(', ')} WHERE id = ?\`,
      params
    );
    
    return this.getUserById(db, id);
  }

  // 刪除用戶（包含級聯刪除）
  static async deleteUser(db, id) {
    // 級聯刪除所有相關數據
    await db.run('DELETE FROM tasks WHERE created_by = ? OR assigned_to_user_id = ? OR accepted_by_user_id = ?', [id, id, id]);
    await db.run('DELETE FROM leave_requests WHERE user_id = ? OR approver_id = ?', [id, id]);
    await db.run('DELETE FROM schedules WHERE user_id = ? OR reviewed_by = ?', [id, id]);
    await db.run('DELETE FROM routine_records WHERE user_id = ?', [id]);
    await db.run('DELETE FROM attendance_records WHERE user_id = ?', [id]);
    await db.run('DELETE FROM reports WHERE user_id = ?', [id]);
    await db.run('DELETE FROM finance WHERE user_id = ?', [id]);
    await db.run('DELETE FROM announcements WHERE created_by = ?', [id]);
    await db.run('DELETE FROM suggestions WHERE author_id = ? OR status_changed_by = ?', [id, id]);
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    
    return { success: true };
  }
}

module.exports = UserService;
`;

fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✓ UserService 已更新為靜態方法模式');
console.log('SUCCESS');
