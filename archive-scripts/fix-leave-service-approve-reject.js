const fs = require('fs');

console.log('=== Fixing LeaveRequestService approve/reject methods ===');

const serviceContent = `class LeaveRequestService {
  // Get all leave requests with role-based filtering
  static async getAllLeaveRequests(db, currentUser) {
    let query = 'SELECT * FROM leave_requests';
    let params = [];

    if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') {
      // BOSS and MANAGER can see all
    } else if (currentUser.role === 'SUPERVISOR') {
      query += ' WHERE department_id = ?';
      params.push(currentUser.department);
    } else {
      query += ' WHERE user_id = ?';
      params.push(currentUser.id);
    }

    query += ' ORDER BY created_at DESC';
    return await db.all(query, params);
  }

  // Get leave request by ID
  static async getLeaveRequestById(db, id) {
    return await db.get('SELECT * FROM leave_requests WHERE id = ?', [id]);
  }

  // Create new leave request with conflict check
  static async createLeaveRequest(db, data) {
    const {
      userId,
      departmentId,
      leaveType,
      startDate,
      endDate,
      startPeriod,
      endPeriod,
      days,
      reason,
      proxyUserId
    } = data;

    const id = \`leave-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    const now = new Date().toISOString();

    // Check for overlapping leaves
    const overlapping = await db.all(
      \`SELECT * FROM leave_requests
       WHERE user_id = ?
       AND status IN ('PENDING', 'APPROVED', 'CONFLICT')
       AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))\`,
      [userId, endDate, startDate, startDate, endDate]
    );

    const hasConflict = overlapping.length > 0;
    const status = hasConflict ? 'CONFLICT' : 'PENDING';
    const conflictDetails = hasConflict ? JSON.stringify(overlapping.map(l => ({
      id: l.id,
      start_date: l.start_date,
      end_date: l.end_date,
      message: \`Conflict with leave (\${l.start_date} - \${l.end_date})\`
    }))) : null;

    await db.run(
      \`INSERT INTO leave_requests (
        id, user_id, department_id, leave_type, start_date, end_date,
        start_period, end_period, days, reason, status, has_conflict,
        conflict_details, proxy_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        id, userId, departmentId, leaveType, startDate, endDate,
        startPeriod || 'FULL', endPeriod || 'FULL', days, reason,
        status, hasConflict ? 1 : 0, conflictDetails, proxyUserId, now, now
      ]
    );

    return await this.getLeaveRequestById(db, id);
  }

  // Approve leave request
  static async approveLeaveRequest(db, id, approverId, approvalNotes, conflictOverride) {
    const now = new Date().toISOString();
    
    await db.run(
      \`UPDATE leave_requests SET
        status = 'APPROVED',
        approver_id = ?,
        approval_notes = ?,
        conflict_override = ?,
        approved_at = ?,
        updated_at = ?
      WHERE id = ?\`,
      [approverId, approvalNotes, conflictOverride ? 1 : 0, now, now, id]
    );

    return await this.getLeaveRequestById(db, id);
  }

  // Reject leave request
  static async rejectLeaveRequest(db, id, approverId, approvalNotes) {
    const now = new Date().toISOString();
    
    await db.run(
      \`UPDATE leave_requests SET
        status = 'REJECTED',
        approver_id = ?,
        approval_notes = ?,
        approved_at = ?,
        updated_at = ?
      WHERE id = ?\`,
      [approverId, approvalNotes, now, now, id]
    );

    return await this.getLeaveRequestById(db, id);
  }

  // Delete leave request
  static async deleteLeaveRequest(db, id) {
    await db.run('DELETE FROM leave_requests WHERE id = ?', [id]);
    return { success: true };
  }

  // Get department rules
  static async getDepartmentRules(db, departmentId) {
    return await db.get(
      'SELECT * FROM leave_rules WHERE department_id = ?',
      [departmentId]
    );
  }

  // Update department rules
  static async updateDepartmentRules(db, departmentId, rules) {
    const now = new Date().toISOString();
    const existing = await this.getDepartmentRules(db, departmentId);

    if (existing) {
      await db.run(
        \`UPDATE leave_rules
         SET max_days = ?, min_notice_days = ?, max_consecutive_days = ?,
             require_proxy = ?, updated_at = ?
         WHERE department_id = ?\`,
        [
          rules.maxDays,
          rules.minNoticeDays,
          rules.maxConsecutiveDays,
          rules.requireProxy ? 1 : 0,
          now,
          departmentId
        ]
      );
    } else {
      const id = \`rule-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
      await db.run(
        \`INSERT INTO leave_rules (id, department_id, max_days, min_notice_days, max_consecutive_days, require_proxy, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)\`,
        [
          id,
          departmentId,
          rules.maxDays,
          rules.minNoticeDays,
          rules.maxConsecutiveDays,
          rules.requireProxy ? 1 : 0,
          now,
          now
        ]
      );
    }

    return await this.getDepartmentRules(db, departmentId);
  }
}

module.exports = LeaveRequestService;
`;

const filePath = '/app/services/leaveRequestService.js';
fs.writeFileSync(filePath, serviceContent, 'utf8');

console.log('+ LeaveRequestService fixed');
console.log('+ File size:', serviceContent.length, 'bytes');
console.log('SUCCESS');
