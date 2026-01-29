const fs = require('fs');

console.log('=== Creating FinanceService ===');

const serviceContent = `class FinanceService {
  // Get all finance records
  static async getAllRecords(db) {
    const records = db.prepare('SELECT * FROM finance ORDER BY created_at DESC').all();
    return records;
  }

  // Get finance record by ID
  static async getRecordById(db, id) {
    const record = db.prepare('SELECT * FROM finance WHERE id = ?').get(id);
    return record;
  }

  // Create new finance record
  static async createRecord(db, data) {
    const {
      type,
      amount,
      description,
      category,
      userId,
      departmentId,
      date,
      scope,
      ownerId,
      recordedBy,
      attachment
    } = data;

    const id = \`finance-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    const now = new Date().toISOString();
    const recordDate = date || new Date().toISOString().split('T')[0];
    
    // Ensure amount is a number (防禦性編程 - 從歷史記錄學到的)
    const finalAmount = Number(amount);

    db.prepare(
      \`INSERT INTO finance (id, type, amount, description, category, user_id, department_id, date, status, created_at, updated_at, scope, owner_id, recorded_by, attachment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`
    ).run(
      id,
      type,
      finalAmount,
      description || '',
      category || 'OTHER',
      userId,
      departmentId,
      recordDate,
      'PENDING',
      now,
      now,
      scope || 'DEPARTMENT',
      ownerId || null,
      recordedBy || userId,
      attachment || null
    );

    return this.getRecordById(db, id);
  }

  // Update finance record
  static async updateRecord(db, id, data) {
    const updates = [];
    const params = [];

    if (data.type !== undefined) {
      updates.push('type = ?');
      params.push(data.type);
    }
    if (data.amount !== undefined) {
      updates.push('amount = ?');
      params.push(Number(data.amount)); // 確保是數字
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category);
    }
    if (data.date !== undefined) {
      updates.push('date = ?');
      params.push(data.date);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    db.prepare(
      \`UPDATE finance SET \${updates.join(', ')} WHERE id = ?\`
    ).run(...params);

    return this.getRecordById(db, id);
  }

  // Delete finance record
  static async deleteRecord(db, id) {
    db.prepare('DELETE FROM finance WHERE id = ?').run(id);
    return { success: true };
  }

  // Confirm finance record (change status to CONFIRMED)
  static async confirmRecord(db, id) {
    const now = new Date().toISOString();
    db.prepare(
      'UPDATE finance SET status = ?, updated_at = ? WHERE id = ?'
    ).run('CONFIRMED', now, id);

    return this.getRecordById(db, id);
  }
}

module.exports = FinanceService;
`;

const filePath = '/app/services/financeService.js';
fs.writeFileSync(filePath, serviceContent, 'utf8');

console.log('+ FinanceService created at:', filePath);
console.log('+ File size:', serviceContent.length, 'bytes');
console.log('SUCCESS');
