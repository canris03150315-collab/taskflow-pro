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
  
  // \u6bcf\u500b\u5e73\u53f0\u6709 16 \u500b\u6b04\u4f4d\uff08\u4e0d\u542b\u5e73\u53f0\u540d\u7a31\uff09
  for (let col = 1; col < range.e.c; col += 16) {
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
      const baseCol = 1 + (idx * 16);
      
      const getCell = (offset) => {
        const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: baseCol + offset })];
        return cell && cell.v !== undefined ? Number(cell.v) || 0 : 0;
      };
      
      records.push({
        platform_name: platformName,
        date: date,
        rebate_amount: getCell(0),              // \u53cd\u6c34
        real_person_count: getCell(1),          // \u771f\u4eba\u6570
        chess_amount: getCell(2),               // \u68cb\u724c
        external_game_amount: getCell(3),       // \u5916\u63a5\u904a\u6232
        lottery_private_return: getCell(4),     // \u5f69\u7968\u79c1\u8fd4
        claim_dividend: getCell(5),             // \u9818\u53d6\u5206\u7d05
        external_dividend: getCell(6),          // \u5916\u63a5\u5206\u7d05
        delisted_dividend_1: getCell(7),        // \u4e0b\u67b6\u5206\u7d05 1
        delisted_dividend_2: getCell(8),        // \u4e0b\u67b6\u5206\u7d05 2
        private_return: getCell(9),             // \u79c1\u8fd4
        deposit_amount: getCell(10),            // \u5145\u503c
        withdrawal_amount: getCell(11),         // \u63d0\u6b3e
        loan_amount: getCell(12),               // \u501f\u6b3e
        profit: getCell(13),                    // \u71df\u5229
        balance: getCell(14),                   // \u9918\u984d
        lottery_amount: getCell(0)              // \u4fdd\u7559\u820a\u6b04\u4f4d\u76f8\u5bb9\u6027
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
    
    const db = req.db;
    
    for (const record of records) {
      const existing = dbCall(db, 'prepare',
        'SELECT * FROM platform_transactions WHERE platform_name = ? AND date = ?'
      ).get(record.platform_name, record.date);
      
      if (existing) {
        const differences = {};
        const fields = [
          'rebate_amount', 'real_person_count', 'chess_amount',
          'external_game_amount', 'lottery_private_return', 'claim_dividend',
          'external_dividend', 'delisted_dividend_1', 'delisted_dividend_2',
          'private_return', 'deposit_amount', 'withdrawal_amount',
          'loan_amount', 'profit', 'balance', 'lottery_amount'
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
    
    const db = req.db;
    
    dbCall(db, 'prepare', 'BEGIN TRANSACTION').run();
    
    try {
      for (const record of records) {
        const existing = dbCall(db, 'prepare',
          'SELECT * FROM platform_transactions WHERE platform_name = ? AND date = ?'
        ).get(record.platform_name, record.date);
        
        if (existing && action === 'overwrite') {
          dbCall(db, 'prepare', `
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
          
          dbCall(db, 'prepare', `
            UPDATE platform_transactions SET
              rebate_amount = ?, real_person_count = ?, chess_amount = ?,
              external_game_amount = ?, lottery_private_return = ?, claim_dividend = ?,
              external_dividend = ?, delisted_dividend_1 = ?, delisted_dividend_2 = ?,
              private_return = ?, deposit_amount = ?, withdrawal_amount = ?,
              loan_amount = ?, profit = ?, balance = ?, lottery_amount = ?,
              last_modified_by = ?, last_modified_by_name = ?, last_modified_at = ?,
              updated_at = ?
            WHERE id = ?
          `).run(
            record.rebate_amount, record.real_person_count, record.chess_amount,
            record.external_game_amount, record.lottery_private_return, record.claim_dividend,
            record.external_dividend, record.delisted_dividend_1, record.delisted_dividend_2,
            record.private_return, record.deposit_amount, record.withdrawal_amount,
            record.loan_amount, record.profit, record.balance, record.lottery_amount,
            user.id, user.name, now, now, existing.id
          );
          
          imported++;
        } else if (!existing) {
          const id = uuidv4();
          
          dbCall(db, 'prepare', `
            INSERT INTO platform_transactions 
            (id, platform_name, date, rebate_amount, real_person_count, chess_amount,
             external_game_amount, lottery_private_return, claim_dividend,
             external_dividend, delisted_dividend_1, delisted_dividend_2,
             private_return, deposit_amount, withdrawal_amount, loan_amount,
             profit, balance, lottery_amount,
             uploaded_by, uploaded_by_name, uploaded_at, upload_file_name,
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id, record.platform_name, record.date,
            record.rebate_amount, record.real_person_count, record.chess_amount,
            record.external_game_amount, record.lottery_private_return, record.claim_dividend,
            record.external_dividend, record.delisted_dividend_1, record.delisted_dividend_2,
            record.private_return, record.deposit_amount, record.withdrawal_amount,
            record.loan_amount, record.profit, record.balance, record.lottery_amount,
            user.id, user.name, now, fileName || 'unknown.xlsx',
            now, now
          );
          
          dbCall(db, 'prepare', `
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
      
      dbCall(db, 'prepare', 'COMMIT').run();
    } catch (error) {
      dbCall(db, 'prepare', 'ROLLBACK').run();
      throw error;
    }
    
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
    
    const db = req.db;
    const records = dbCall(db, 'prepare', query).all(...params);
    
    res.json({ records });
    
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u6578\u64da\u5931\u6557: ' + error.message });
  }
});

router.get('/platforms', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const platforms = dbCall(db, 'prepare', 
      'SELECT DISTINCT platform_name FROM platform_transactions ORDER BY platform_name'
    ).all();
    
    res.json({ platforms: platforms.map(p => p.platform_name) });
    
  } catch (error) {
    console.error('Get platforms error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u5e73\u53f0\u5217\u8868\u5931\u6557: ' + error.message });
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
        SUM(rebate_amount) as total_rebate,
        SUM(chess_amount) as total_chess,
        SUM(external_game_amount) as total_external_game,
        SUM(claim_dividend) as total_claim_dividend,
        SUM(loan_amount) as total_loan
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
    
    query += ' GROUP BY platform_name ORDER BY platform_name';
    
    const db = req.db;
    const stats = dbCall(db, 'prepare', query).all(...params);
    
    res.json({ stats });
    
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u5e73\u53f0\u7d71\u8a08\u5931\u6557: ' + error.message });
  }
});

router.get('/stats/date', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        date,
        COUNT(DISTINCT platform_name) as platform_count,
        SUM(deposit_amount) as total_deposit,
        SUM(withdrawal_amount) as total_withdrawal,
        SUM(profit) as total_profit,
        SUM(rebate_amount) as total_rebate,
        SUM(chess_amount) as total_chess,
        SUM(external_game_amount) as total_external_game
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
    
    query += ' GROUP BY date ORDER BY date DESC';
    
    const db = req.db;
    const stats = dbCall(db, 'prepare', query).all(...params);
    
    res.json({ stats });
    
  } catch (error) {
    console.error('Get date stats error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u65e5\u671f\u7d71\u8a08\u5931\u6557: ' + error.message });
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
    
    query += ' ORDER BY action_at DESC LIMIT 1000';
    
    const db = req.db;
    const history = dbCall(db, 'prepare', query).all(...params);
    
    res.json({ history });
    
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u6b77\u53f2\u8a18\u9304\u5931\u6557: ' + error.message });
  }
});

router.post('/restore/:historyId', authenticateToken, async (req, res) => {
  try {
    const { historyId } = req.params;
    const user = req.user;
    
    const db = req.db;
    
    const historyRecord = dbCall(db, 'prepare',
      'SELECT * FROM platform_transaction_history WHERE id = ?'
    ).get(historyId);
    
    if (!historyRecord) {
      return res.status(404).json({ error: '\u6b77\u53f2\u8a18\u9304\u4e0d\u5b58\u5728' });
    }
    
    const oldData = JSON.parse(historyRecord.old_data || '{}');
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 'BEGIN TRANSACTION').run();
    
    try {
      const current = dbCall(db, 'prepare',
        'SELECT * FROM platform_transactions WHERE id = ?'
      ).get(historyRecord.transaction_id);
      
      dbCall(db, 'prepare', `
        UPDATE platform_transactions SET
          rebate_amount = ?, real_person_count = ?, chess_amount = ?,
          external_game_amount = ?, lottery_private_return = ?, claim_dividend = ?,
          external_dividend = ?, delisted_dividend_1 = ?, delisted_dividend_2 = ?,
          private_return = ?, deposit_amount = ?, withdrawal_amount = ?,
          loan_amount = ?, profit = ?, balance = ?, lottery_amount = ?,
          last_modified_by = ?, last_modified_by_name = ?, last_modified_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        oldData.rebate_amount, oldData.real_person_count, oldData.chess_amount,
        oldData.external_game_amount, oldData.lottery_private_return, oldData.claim_dividend,
        oldData.external_dividend, oldData.delisted_dividend_1, oldData.delisted_dividend_2,
        oldData.private_return, oldData.deposit_amount, oldData.withdrawal_amount,
        oldData.loan_amount, oldData.profit, oldData.balance, oldData.lottery_amount,
        user.id, user.name, now, now, historyRecord.transaction_id
      );
      
      dbCall(db, 'prepare', `
        INSERT INTO platform_transaction_history 
        (id, transaction_id, action_type, action_by, action_by_name, action_at, 
         old_data, new_data, changes_summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        historyRecord.transaction_id,
        'RESTORE',
        user.id,
        user.name,
        now,
        JSON.stringify(current),
        JSON.stringify(oldData),
        `Restored from history ${historyId}`,
        now
      );
      
      dbCall(db, 'prepare', 'COMMIT').run();
    } catch (error) {
      dbCall(db, 'prepare', 'ROLLBACK').run();
      throw error;
    }
    
    res.json({ success: true, message: '\u6210\u529f\u9084\u539f\u6578\u64da' });
    
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: '\u9084\u539f\u5931\u6557: ' + error.message });
  }
});

router.get('/export', authenticateToken, async (req, res) => {
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
    
    const db = req.db;
    const records = dbCall(db, 'prepare', query).all(...params);
    
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(records);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Platform Revenue');
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=platform-revenue-export.xlsx');
    res.send(buffer);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: '\u532f\u51fa\u5931\u6557: ' + error.message });
  }
});

module.exports = router;
