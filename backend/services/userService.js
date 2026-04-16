"use strict";

// User Service - provides CRUD operations for users with permissions parsing

async function getAllUsers(db, currentUser) {
    const users = await db.all(
        'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users'
    );
    return users.map(u => ({
        ...u,
        permissions: u.permissions ? JSON.parse(u.permissions) : undefined
    }));
}

async function getUserById(db, id) {
    const user = await db.get(
        'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = ?',
        [id]
    );
    if (!user) return null;
    return {
        ...user,
        permissions: user.permissions ? JSON.parse(user.permissions) : undefined
    };
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

    if (updates.length === 0) return;

    updates.push("updated_at = datetime('now')");
    params.push(id);

    await db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
    );
}

async function deleteUser(db, id) {
    await db.run('DELETE FROM users WHERE id = ?', [id]);
}

async function getUsersByDepartment(db, departmentId) {
    const users = await db.all(
        'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE department = ?',
        [departmentId]
    );
    return users.map(u => ({
        ...u,
        permissions: u.permissions ? JSON.parse(u.permissions) : undefined
    }));
}

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getUsersByDepartment
};
