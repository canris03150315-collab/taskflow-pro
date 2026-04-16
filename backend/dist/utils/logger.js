"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSystemAction = logSystemAction;
exports.hasPermission = hasPermission;
exports.canManageUser = canManageUser;
exports.canManageDepartment = canManageDepartment;
async function logSystemAction(db, user, action, details, level = 'INFO') {
    try {
        // 支援傳入用戶對象或用戶ID
        const userId = typeof user === 'string' ? user : user.id;
        const userName = typeof user === 'string' ?
            (db.getUserById(userId)?.name || 'Unknown') :
            (user.name || 'Unknown');
        // 記錄日誌
        db.logAction(userId, userName, action, details, level);
        console.log(`[${level}] ${userName} (${userId}): ${action} - ${details}`);
    }
    catch (error) {
        console.error('記錄系統日誌失敗:', error);
    }
}
function hasPermission(user, permission) {
    // BOSS, MANAGER, SUPERVISOR 預設擁有所有管理權限
    if (user.role === 'BOSS' || user.role === 'MANAGER' || user.role === 'SUPERVISOR') {
        // SYSTEM_RESET 只有 BOSS 預設擁有
        if (permission === 'SYSTEM_RESET' && user.role !== 'BOSS') {
            return user.permissions?.includes(permission) || false;
        }
        return true;
    }
    // 員工檢查自定義權限
    return user.permissions?.includes(permission) || false;
}
function canManageUser(currentUser, targetUser) {
    // BOSS 可以管理所有人
    if (currentUser.role === 'BOSS')
        return true;
    // MANAGER 可以管理除 BOSS 外的所有人
    if (currentUser.role === 'MANAGER' && targetUser.role !== 'BOSS')
        return true;
    // SUPERVISOR 可以管理 EMPLOYEE 和 SUPERVISOR
    if (currentUser.role === 'SUPERVISOR') {
        return targetUser.role === 'EMPLOYEE' || targetUser.role === 'SUPERVISOR';
    }
    // 用戶只能管理自己
    return currentUser.id === targetUser.id;
}
function canManageDepartment(currentUser, departmentId) {
    // BOSS 和 MANAGER 可以管理所有部門
    if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER')
        return true;
    // SUPERVISOR 只能管理自己的部門
    if (currentUser.role === 'SUPERVISOR') {
        return currentUser.department === departmentId;
    }
    return false;
}
//# sourceMappingURL=logger.js.map