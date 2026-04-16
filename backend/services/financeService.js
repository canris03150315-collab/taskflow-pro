"use strict";

async function getAllRecords(db) {
    return await db.all('SELECT * FROM finance_records ORDER BY date DESC, created_at DESC');
}

async function createRecord(db, data) {
    const id = `finance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await db.run(
        `INSERT INTO finance_records (id, type, amount, description, category, user_id, department_id, date, status, scope, owner_id, recorded_by, attachment, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)`,
        [
            id,
            data.type,
            data.amount,
            data.description || '',
            data.category || '',
            data.userId,
            data.departmentId,
            data.date,
            data.scope || 'DEPARTMENT',
            data.ownerId || null,
            data.recordedBy || null,
            data.attachment || null,
            now,
            now
        ]
    );

    return await db.get('SELECT * FROM finance_records WHERE id = ?', [id]);
}

async function updateRecord(db, id, updateData) {
    const updates = [];
    const params = [];

    if (updateData.type !== undefined) { updates.push('type = ?'); params.push(updateData.type); }
    if (updateData.amount !== undefined) { updates.push('amount = ?'); params.push(updateData.amount); }
    if (updateData.description !== undefined) { updates.push('description = ?'); params.push(updateData.description); }
    if (updateData.category !== undefined) { updates.push('category = ?'); params.push(updateData.category); }
    if (updateData.date !== undefined) { updates.push('date = ?'); params.push(updateData.date); }
    if (updateData.status !== undefined) { updates.push('status = ?'); params.push(updateData.status); }
    if (updateData.confirmedBy !== undefined) { updates.push('confirmed_by = ?'); params.push(updateData.confirmedBy); }
    if (updateData.confirmedAt !== undefined) { updates.push('confirmed_at = ?'); params.push(updateData.confirmedAt); }

    if (updates.length === 0) {
        return await db.get('SELECT * FROM finance_records WHERE id = ?', [id]);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await db.run(`UPDATE finance_records SET ${updates.join(', ')} WHERE id = ?`, params);
    return await db.get('SELECT * FROM finance_records WHERE id = ?', [id]);
}

async function deleteRecord(db, id) {
    await db.run('DELETE FROM finance_records WHERE id = ?', [id]);
}

module.exports = {
    getAllRecords,
    createRecord,
    updateRecord,
    deleteRecord
};
