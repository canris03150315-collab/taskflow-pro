'use strict';

// User Service - provides CRUD operations for users with permissions parsing

const SELECT_FIELDS =
  'id, name, role, department, avatar, username, permissions, exclude_from_attendance, created_at, updated_at';

function normalizeUser(u) {
  if (!u) return null;
  return {
    ...u,
    permissions: u.permissions ? JSON.parse(u.permissions) : undefined,
    exclude_from_attendance: u.exclude_from_attendance === 1 || u.exclude_from_attendance === true,
  };
}

async function getAllUsers(db, currentUser) {
  const users = await db.all(`SELECT ${SELECT_FIELDS} FROM users`);
  return users.map(normalizeUser);
}

async function getUserById(db, id) {
  const user = await db.get(`SELECT ${SELECT_FIELDS} FROM users WHERE id = ?`, [id]);
  return normalizeUser(user);
}

async function updateUser(db, id, updateData) {
  const updates = [];
  const params = [];

  if (updateData.name !== undefined) {
    updates.push('name = ?');
    params.push(updateData.name);
  }
  if (updateData.role !== undefined) {
    updates.push('role = ?');
    params.push(updateData.role);
  }
  if (updateData.department !== undefined) {
    updates.push('department = ?');
    params.push(updateData.department);
  }
  if (updateData.avatar !== undefined) {
    updates.push('avatar = ?');
    params.push(updateData.avatar);
  }
  if (updateData.permissions !== undefined) {
    updates.push('permissions = ?');
    params.push(JSON.stringify(updateData.permissions));
  }
  if (updateData.exclude_from_attendance !== undefined) {
    updates.push('exclude_from_attendance = ?');
    params.push(updateData.exclude_from_attendance ? 1 : 0);
  }

  if (updates.length === 0) return;

  updates.push("updated_at = datetime('now')");
  params.push(id);

  await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
}

async function deleteUser(db, id) {
  await db.run('DELETE FROM users WHERE id = ?', [id]);
}

async function getUsersByDepartment(db, departmentId) {
  const users = await db.all(`SELECT ${SELECT_FIELDS} FROM users WHERE department = ?`, [
    departmentId,
  ]);
  return users.map(normalizeUser);
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUsersByDepartment,
};
