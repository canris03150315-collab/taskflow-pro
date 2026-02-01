const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error(`Method ${method} not found on database object`);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '\u7f3a\u5c11\u8a8d\u8b49 Token' });
  }
  
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: '\u7121\u6548\u7684 Token' });
  }
}

function parseExcelDate(excelDate) {
  if (typeof excelDate === 'string') return excelDate;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseExcelFile(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = xlsx.utils.decode_range(worksheet['!ref']);
  
  const platforms = [];
  const platformNames = [];
  
  for (let col = 1; col < range.e.c; col += 11) {
    const headerCell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    if (headerCell && headerCell.v) {
      platformNames.push(headerCell.v);
    }
  }
  
  const records = [];
  
  for (let row = 1; row <= range.e.r; row++) {
    const dateCell = worksheet[xlsx.utils.encode_cell({ r: row, c: 0 })];
    if (!dateCell || !dateCell.v) continue;
    
    const date = parseExcelDate(dateCell.v);
    
    platformNames.forEach((platformName, idx) => {
      const baseCol = 1 + (idx * 11);
      
      const getCell = (offset) => {
        const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: baseCol + offset })];
        return cell && cell.v !== undefined ? Number(cell.v) || 0 : 0;
      };
      
      records.push({
        platform_name: platformName,
        date: date,
        lottery_amount: getCell(0),
        external_game_amount: getCell(1),
        lottery_dividend: getCell(2),
        external_dividend: getCell(3),
        private_return: getCell(4),
        deposit_amount: getCell(5),
        withdrawal_amount: getCell(6),
        loan_amount: getCell(7),
        profit: getCell(8),
        balance: getCell(9)
      });
    });
  }
  
  return records;
}

router.post('/parse', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '\u8acb\u4e0a\u50b3\u6a94\u6848' });
    }
    
    const records = parseExcelFile(req.file.buffer);
    
    const duplicates = [];
    const newRecords = [];
    
    for (const record of records) {
      const existing = await dbCall(db => {
        return db.prepare(
          'SELECT * FROM platform_transactions WHERE platform_name = ? AND date = ?'
        ).get(record.platform_name, record.date);
      });
      
      if (existing) {
        const differences = {};
        const fields = [
          'lottery_amount', 'external_game_amount', 'lottery_dividend',
          'external_dividend', 'private_return', 'deposit_amount',
          'withdrawal_amount', 'loan_amount', 'profit', 'balance'
        ];
        
        fields.forEach(field => {
          if (existing[field] !== record[field]) {
            differences[field] = {
              old: existing[field],
              new: record[field],
              change: record[field] - existing[field]
            };
          }
        });
        
        if (Object.keys(differences).length > 0) {
          duplicates.push({
            platform: record.platform_name,
            date: record.date,
            existing: existing,
            new: record,
            differences: differences
          });
        }
      } else {
        newRecords.push(record);
      }
    }
    
    res.json({
      hasConflicts: duplicates.length > 0,
      duplicates: duplicates,
      newRecords: newRecords,
      totalRecords: records.length,
      fileName: req.file.originalname
    });
    
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: '\u89e3\u6790\u6a94\u6848\u5931\u6557: ' + error.message });
  }
});

router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { records, action, fileName } = req.body;
    const user = req.user;
    
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: '\u7121\u6548\u7684\u6578\u64da\u683c\u5f0f' });
    }
    
    const now = new Date().toISOString();
    let imported = 0;
    
    await dbCall(db => {
      db.prepare('BEGIN TRANSACTION').run();
      
      try {
        for (const record of records) {
          const existing = db.prepare(
            'SELECT * FROM platform_transactions WHERE platform_name = ? AND date = ?'
          ).get(record.platform_name, record.date);
          
          if (existing && action === 'overwrite') {
            db.prepare(`
              INSERT INTO platform_transaction_history 
              (id, transaction_id, action_type, action_by, action_by_name, action_at, 
               old_data, new_data, changes_summary, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              uuidv4(),
              existing.id,
              'UPDATE',
              user.id,
              user.name,
              now,
              JSON.stringify(existing),
              JSON.stringify(record),
              'Overwrite from Excel upload',
              now
            );
            
            db.prepare(`
              UPDATE platform_transactions SET
                lottery_amount = ?, external_game_amount = ?, lottery_dividend = ?,
                external_dividend = ?, private_return = ?, deposit_amount = ?,
                withdrawal_amount = ?, loan_amount = ?, profit = ?, balance = ?,
                last_modified_by = ?, last_modified_by_name = ?, last_modified_at = ?,
                updated_at = ?
              WHERE id = ?
            `).run(
              record.lottery_amount, record.external_game_amount, record.lottery_dividend,
              record.external_dividend, record.private_return, record.deposit_amount,
              record.withdrawal_amount, record.loan_amount, record.profit, record.balance,
              user.id, user.name, now, now, existing.id
            );
            
            imported++;
          } else if (!existing) {
            const id = uuidv4();
            
            db.prepare(`
              INSERT INTO platform_transactions 
              (id, platform_name, date, lottery_amount, external_game_amount, 
               lottery_dividend, external_dividend, private_return, deposit_amount,
               withdrawal_amount, loan_amount, profit, balance,
               uploaded_by, uploaded_by_name, uploaded_at, upload_file_name,
               created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              id, record.platform_name, record.date,
              record.lottery_amount, record.external_game_amount,
              record.lottery_dividend, record.external_dividend, record.private_return,
              record.deposit_amount, record.withdrawal_amount, record.loan_amount,
              record.profit, record.balance,
              user.id, user.name, now, fileName || 'unknown.xlsx',
              now, now
            );
            
            db.prepare(`
              INSERT INTO platform_transaction_history 
              (id, transaction_id, action_type, action_by, action_by_name, action_at, 
               new_data, changes_summary, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              uuidv4(), id, 'CREATE', user.id, user.name, now,
              JSON.stringify(record), 'Created from Excel upload', now
            );
            
            imported++;
          }
        }
        
        db.prepare('COMMIT').run();
      } catch (error) {
        db.prepare('ROLLBACK').run();
        throw error;
      }
    });
    
    res.json({ 
      success: true, 
      imported: imported,
      message: `\u6210\u529f\u532f\u5165 ${imported} \u7b46\u6578\u64da`
    });
    
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: '\u532f\u5165\u5931\u6557: ' + error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, platform } = req.query;
    
    let query = 'SELECT * FROM platform_transactions WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    if (platform) {
      query += ' AND platform_name = ?';
      params.push(platform);
    }
    
    query += ' ORDER BY date DESC, platform_name ASC';
    
    const records = await dbCall(db => {
      return db.prepare(query).all(...params);
    });
    
    res.json(records);
    
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u6578\u64da\u5931\u6557' });
  }
});

router.get('/platforms', authenticateToken, async (req, res) => {
  try {
    const platforms = await dbCall(db => {
      return db.prepare(
        'SELECT DISTINCT platform_name FROM platform_transactions ORDER BY platform_name'
      ).all();
    });
    
    res.json(platforms.map(p => p.platform_name));
    
  } catch (error) {
    console.error('Get platforms error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u5e73\u53f0\u5217\u8868\u5931\u6557' });
  }
});

router.get('/stats/platform', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        platform_name,
        COUNT(*) as record_count,
        SUM(deposit_amount) as total_deposit,
        SUM(withdrawal_amount) as total_withdrawal,
        SUM(profit) as total_profit,
        AVG(profit) as avg_profit,
        MAX(profit) as max_profit,
        MIN(profit) as min_profit
      FROM platform_transactions
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    query += ' GROUP BY platform_name ORDER BY total_profit DESC';
    
    const stats = await dbCall(db => {
      return db.prepare(query).all(...params);
    });
    
    res.json(stats);
    
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u5e73\u53f0\u7d71\u8a08\u5931\u6557' });
  }
});

router.get('/stats/date', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, platform } = req.query;
    
    let query = `
      SELECT 
        date,
        COUNT(*) as platform_count,
        SUM(deposit_amount) as total_deposit,
        SUM(withdrawal_amount) as total_withdrawal,
        SUM(profit) as total_profit
      FROM platform_transactions
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    if (platform) {
      query += ' AND platform_name = ?';
      params.push(platform);
    }
    
    query += ' GROUP BY date ORDER BY date DESC';
    
    const stats = await dbCall(db => {
      return db.prepare(query).all(...params);
    });
    
    res.json(stats);
    
  } catch (error) {
    console.error('Get date stats error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u65e5\u671f\u7d71\u8a08\u5931\u6557' });
  }
});

router.get('/history/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const history = await dbCall(db => {
      return db.prepare(
        'SELECT * FROM platform_transaction_history WHERE transaction_id = ? ORDER BY action_at DESC'
      ).all(transactionId);
    });
    
    res.json(history);
    
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u6b77\u53f2\u8a18\u9304\u5931\u6557' });
  }
});

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, actionBy, actionType } = req.query;
    
    let query = 'SELECT * FROM platform_transaction_history WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND action_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND action_at <= ?';
      params.push(endDate);
    }
    
    if (actionBy) {
      query += ' AND action_by = ?';
      params.push(actionBy);
    }
    
    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }
    
    query += ' ORDER BY action_at DESC LIMIT 500';
    
    const history = await dbCall(db => {
      return db.prepare(query).all(...params);
    });
    
    res.json(history);
    
  } catch (error) {
    console.error('Get all history error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u6b77\u53f2\u8a18\u9304\u5931\u6557' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    if (!['SUPERVISOR', 'MANAGER', 'BOSS'].includes(user.role)) {
      return res.status(403).json({ error: '\u6b0a\u9650\u4e0d\u8db3' });
    }
    
    const existing = await dbCall(db => {
      return db.prepare('SELECT * FROM platform_transactions WHERE id = ?').get(id);
    });
    
    if (!existing) {
      return res.status(404).json({ error: '\u8a18\u9304\u4e0d\u5b58\u5728' });
    }
    
    const updates = req.body;
    const now = new Date().toISOString();
    
    await dbCall(db => {
      db.prepare('BEGIN TRANSACTION').run();
      
      try {
        db.prepare(`
          INSERT INTO platform_transaction_history 
          (id, transaction_id, action_type, action_by, action_by_name, action_at, 
           old_data, new_data, changes_summary, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), id, 'UPDATE', user.id, user.name, now,
          JSON.stringify(existing), JSON.stringify(updates),
          'Manual update', now
        );
        
        const fields = [];
        const values = [];
        
        const allowedFields = [
          'lottery_amount', 'external_game_amount', 'lottery_dividend',
          'external_dividend', 'private_return', 'deposit_amount',
          'withdrawal_amount', 'loan_amount', 'profit', 'balance'
        ];
        
        allowedFields.forEach(field => {
          if (updates[field] !== undefined) {
            fields.push(`${field} = ?`);
            values.push(updates[field]);
          }
        });
        
        fields.push('last_modified_by = ?', 'last_modified_by_name = ?', 'last_modified_at = ?', 'updated_at = ?');
        values.push(user.id, user.name, now, now, id);
        
        db.prepare(`UPDATE platform_transactions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        
        db.prepare('COMMIT').run();
      } catch (error) {
        db.prepare('ROLLBACK').run();
        throw error;
      }
    });
    
    res.json({ success: true, message: '\u66f4\u65b0\u6210\u529f' });
    
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: '\u66f4\u65b0\u5931\u6557' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    if (!['SUPERVISOR', 'MANAGER', 'BOSS'].includes(user.role)) {
      return res.status(403).json({ error: '\u6b0a\u9650\u4e0d\u8db3' });
    }
    
    const existing = await dbCall(db => {
      return db.prepare('SELECT * FROM platform_transactions WHERE id = ?').get(id);
    });
    
    if (!existing) {
      return res.status(404).json({ error: '\u8a18\u9304\u4e0d\u5b58\u5728' });
    }
    
    const now = new Date().toISOString();
    
    await dbCall(db => {
      db.prepare('BEGIN TRANSACTION').run();
      
      try {
        db.prepare(`
          INSERT INTO platform_transaction_history 
          (id, transaction_id, action_type, action_by, action_by_name, action_at, 
           old_data, changes_summary, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), id, 'DELETE', user.id, user.name, now,
          JSON.stringify(existing), 'Manual delete', now
        );
        
        db.prepare('DELETE FROM platform_transactions WHERE id = ?').run(id);
        
        db.prepare('COMMIT').run();
      } catch (error) {
        db.prepare('ROLLBACK').run();
        throw error;
      }
    });
    
    res.json({ success: true, message: '\u522a\u9664\u6210\u529f' });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: '\u522a\u9664\u5931\u6557' });
  }
});

router.post('/restore/:historyId', authenticateToken, async (req, res) => {
  try {
    const { historyId } = req.params;
    const user = req.user;
    
    if (!['SUPERVISOR', 'MANAGER', 'BOSS'].includes(user.role)) {
      return res.status(403).json({ error: '\u6b0a\u9650\u4e0d\u8db3' });
    }
    
    const historyRecord = await dbCall(db => {
      return db.prepare('SELECT * FROM platform_transaction_history WHERE id = ?').get(historyId);
    });
    
    if (!historyRecord) {
      return res.status(404).json({ error: '\u6b77\u53f2\u8a18\u9304\u4e0d\u5b58\u5728' });
    }
    
    const oldData = JSON.parse(historyRecord.old_data || '{}');
    const now = new Date().toISOString();
    
    await dbCall(db => {
      db.prepare('BEGIN TRANSACTION').run();
      
      try {
        if (historyRecord.action_type === 'DELETE') {
          db.prepare(`
            INSERT INTO platform_transactions 
            (id, platform_name, date, lottery_amount, external_game_amount, 
             lottery_dividend, external_dividend, private_return, deposit_amount,
             withdrawal_amount, loan_amount, profit, balance,
             uploaded_by, uploaded_by_name, uploaded_at, upload_file_name,
             last_modified_by, last_modified_by_name, last_modified_at,
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            oldData.id, oldData.platform_name, oldData.date,
            oldData.lottery_amount, oldData.external_game_amount,
            oldData.lottery_dividend, oldData.external_dividend, oldData.private_return,
            oldData.deposit_amount, oldData.withdrawal_amount, oldData.loan_amount,
            oldData.profit, oldData.balance,
            oldData.uploaded_by, oldData.uploaded_by_name, oldData.uploaded_at, oldData.upload_file_name,
            user.id, user.name, now,
            oldData.created_at, now
          );
        } else {
          db.prepare(`
            UPDATE platform_transactions SET
              lottery_amount = ?, external_game_amount = ?, lottery_dividend = ?,
              external_dividend = ?, private_return = ?, deposit_amount = ?,
              withdrawal_amount = ?, loan_amount = ?, profit = ?, balance = ?,
              last_modified_by = ?, last_modified_by_name = ?, last_modified_at = ?,
              updated_at = ?
            WHERE id = ?
          `).run(
            oldData.lottery_amount, oldData.external_game_amount, oldData.lottery_dividend,
            oldData.external_dividend, oldData.private_return, oldData.deposit_amount,
            oldData.withdrawal_amount, oldData.loan_amount, oldData.profit, oldData.balance,
            user.id, user.name, now, now, historyRecord.transaction_id
          );
        }
        
        db.prepare(`
          INSERT INTO platform_transaction_history 
          (id, transaction_id, action_type, action_by, action_by_name, action_at, 
           new_data, changes_summary, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), historyRecord.transaction_id, 'RESTORE', user.id, user.name, now,
          JSON.stringify(oldData), `Restored from history: ${historyId}`, now
        );
        
        db.prepare('COMMIT').run();
      } catch (error) {
        db.prepare('ROLLBACK').run();
        throw error;
      }
    });
    
    res.json({ success: true, message: '\u9084\u539f\u6210\u529f' });
    
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: '\u9084\u539f\u5931\u6557' });
  }
});

router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, platform, format = 'xlsx' } = req.query;
    
    let query = 'SELECT * FROM platform_transactions WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    if (platform) {
      query += ' AND platform_name = ?';
      params.push(platform);
    }
    
    query += ' ORDER BY date DESC, platform_name ASC LIMIT 10000';
    
    const records = await dbCall(db => {
      return db.prepare(query).all(...params);
    });
    
    if (records.length === 0) {
      return res.status(400).json({ error: '\u7121\u6578\u64da\u53ef\u532f\u51fa' });
    }
    
    const worksheet = xlsx.utils.json_to_sheet(records);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Platform Revenue');
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: format });
    
    res.setHeader('Content-Disposition', `attachment; filename=platform-revenue-${Date.now()}.${format}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: '\u532f\u51fa\u5931\u6557' });
  }
});

module.exports = router;
