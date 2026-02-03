const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

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

function parseExcelFile(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = xlsx.utils.decode_range(worksheet['!ref']);
  
  const platformNames = [];
  
  for (let col = 1; col <= range.e.c; col += 18) {
    const headerCell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    if (headerCell && headerCell.v) {
      const platformName = String(headerCell.v).replace(/\t+/g, '').trim();
      if (platformName) {
        platformNames.push({ name: platformName, startCol: col });
      }
    }
  }

  const records = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  for (let row = 4; row <= range.e.r; row++) {
    const dateCell = worksheet[xlsx.utils.encode_cell({ r: row, c: 1 })];
    if (!dateCell || !dateCell.v) continue;

    const dayNum = Number(dateCell.v);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

    platformNames.forEach((platform) => {
      const baseCol = platform.startCol;

      const getCell = (col) => {
        const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
        return cell && cell.v !== undefined ? Number(cell.v) || 0 : 0;
      };

      records.push({
        platform_name: platform.name,
        date: dateStr,
        lottery_amount: getCell(baseCol + 1),
        external_game_amount: getCell(baseCol + 3),
        lottery_dividend: getCell(baseCol + 7),
        external_dividend: getCell(baseCol + 9),
        private_return: getCell(baseCol + 11),
        deposit_amount: getCell(baseCol + 12),
        withdrawal_amount: getCell(baseCol + 13),
        loan_amount: getCell(baseCol + 14),
        profit: getCell(baseCol + 15),
        balance: getCell(baseCol + 16)
      });
    });
  }

  return records;
}

router.post('/parse', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const db = req.db;
    
    if (!req.file) {
      return res.status(400).json({ error: '\u8acb\u4e0a\u50b3\u6a94\u6848' });
    }

    const records = parseExcelFile(req.file.buffer);

    const duplicates = [];
    const newRecords = [];

    for (const record of records) {
      const existing = dbCall(db, 'prepare',
        'SELECT * FROM platform_transactions WHERE platform_name = ? AND date = ?'
      ).get(record.platform_name, record.date);

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
              new: record[field]
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
      success: true,
      total: records.length,
      newRecords: newRecords,
      duplicates: duplicates,
      hasConflicts: duplicates.length > 0,
      fileName: req.file.originalname
    });

  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: '\u89e3\u6790\u5931\u6557' });
  }
});

router.post('/import', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { records, overwrite } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '\u7121\u6548\u7684\u8cc7\u6599' });
    }

    const currentUser = req.user;
    const now = new Date().toISOString();
    let imported = 0;
    let skipped = 0;

    const insertStmt = dbCall(db, 'prepare', `
      INSERT INTO platform_transactions (
        id, platform_name, date,
        lottery_amount, external_game_amount, lottery_dividend,
        external_dividend, private_return, deposit_amount,
        withdrawal_amount, loan_amount, profit, balance,
        uploaded_by, uploaded_by_name, uploaded_at, upload_file_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = dbCall(db, 'prepare', `
      UPDATE platform_transactions SET
        lottery_amount = ?, external_game_amount = ?, lottery_dividend = ?,
        external_dividend = ?, private_return = ?, deposit_amount = ?,
        withdrawal_amount = ?, loan_amount = ?, profit = ?, balance = ?,
        last_modified_by = ?, last_modified_by_name = ?, last_modified_at = ?,
        updated_at = ?
      WHERE platform_name = ? AND date = ?
    `);

    for (const record of records) {
      const existing = dbCall(db, 'prepare',
        'SELECT id FROM platform_transactions WHERE platform_name = ? AND date = ?'
      ).get(record.platform_name, record.date);

      if (existing && overwrite) {
        updateStmt.run(
          record.lottery_amount, record.external_game_amount, record.lottery_dividend,
          record.external_dividend, record.private_return, record.deposit_amount,
          record.withdrawal_amount, record.loan_amount, record.profit, record.balance,
          currentUser.id, currentUser.username, now, now,
          record.platform_name, record.date
        );
        imported++;
      } else if (!existing) {
        const id = `platform-tx-${Date.now()}-${uuidv4().slice(0, 8)}`;
        insertStmt.run(
          id, record.platform_name, record.date,
          record.lottery_amount, record.external_game_amount, record.lottery_dividend,
          record.external_dividend, record.private_return, record.deposit_amount,
          record.withdrawal_amount, record.loan_amount, record.profit, record.balance,
          currentUser.id, currentUser.username, now, record.fileName || '',
          now, now
        );
        imported++;
      } else {
        skipped++;
      }
    }

    res.json({
      success: true,
      imported: imported,
      skipped: skipped,
      total: records.length
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: '\u532f\u5165\u5931\u6557' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
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

    const records = dbCall(db, 'prepare', query).all(...params);

    res.json({
      success: true,
      records: records
    });

  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: '\u67e5\u8a62\u5931\u6557' });
  }
});

router.get('/platforms', authenticateToken, async (req, res) => {
  try {
    const db = req.db;

    const platforms = dbCall(db, 'prepare',
      'SELECT DISTINCT platform_name FROM platform_transactions ORDER BY platform_name'
    ).all();

    res.json({
      success: true,
      platforms: platforms.map(p => p.platform_name)
    });

  } catch (error) {
    console.error('Platforms error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u5e73\u53f0\u5931\u6557' });
  }
});

router.get('/stats/platform', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        platform_name,
        SUM(lottery_amount) as total_lottery,
        SUM(external_game_amount) as total_external,
        SUM(lottery_dividend) as total_lottery_dividend,
        SUM(external_dividend) as total_external_dividend,
        SUM(private_return) as total_private_return,
        SUM(deposit_amount) as total_deposit,
        SUM(withdrawal_amount) as total_withdrawal,
        SUM(loan_amount) as total_loan,
        SUM(profit) as total_profit,
        AVG(balance) as avg_balance
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

    const stats = dbCall(db, 'prepare', query).all(...params);

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: '\u7d71\u8a08\u5931\u6557' });
  }
});

router.get('/stats/by-date', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate, platform } = req.query;

    let query = `
      SELECT 
        date,
        SUM(lottery_amount) as total_lottery,
        SUM(external_game_amount) as total_external,
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

    const stats = dbCall(db, 'prepare', query).all(...params);

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Date stats error:', error);
    res.status(500).json({ error: '\u65e5\u671f\u7d71\u8a08\u5931\u6557' });
  }
});

module.exports = router;
