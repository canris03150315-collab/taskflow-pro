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
  
  // 檢測平台名稱（行 0）
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

  // 數據從行 4 開始
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

      // 詳細欄位映射（根據實際 Excel 結構）
      // 列 1: 日期
      // 列 2: 彩票工资
      // 列 3: 彩票反点
      // 列 4: 真人AG
      // 列 5: 棋牌
      // 列 6: 外接返点
      // 列 7: 真人私返
      // 列 8: 彩票領取分紅
      // 列 9: 彩票下發分紅
      // 列 10: 外接領取分紅
      // 列 11: 外接下發分紅
      // 列 12: 私返
      // 列 13: 充值
      // 列 14: 提款
      // 列 15: 借款
      // 列 16: 营利
      // 列 17: 馀额

      const lotteryWage = getCell(baseCol + 1);
      const lotteryRebate = getCell(baseCol + 2);
      const gameAG = getCell(baseCol + 3);
      const gameChess = getCell(baseCol + 4);
      const gameRebate = getCell(baseCol + 5);
      const gamePrivate = getCell(baseCol + 6);
      const lotteryDividendReceive = getCell(baseCol + 7);
      const lotteryDividendSend = getCell(baseCol + 8);
      const externalDividendReceive = getCell(baseCol + 9);
      const externalDividendSend = getCell(baseCol + 10);
      const privateReturn = getCell(baseCol + 11);
      const depositAmount = getCell(baseCol + 12);
      const withdrawalAmount = getCell(baseCol + 13);
      const loanAmount = getCell(baseCol + 14);
      const profit = getCell(baseCol + 15);
      const balance = getCell(baseCol + 16);

      // 計算合併欄位（保持向後兼容）
      const lotteryAmount = lotteryWage + lotteryRebate;
      const externalGameAmount = gameAG + gameChess + gameRebate + gamePrivate;
      const lotteryDividend = lotteryDividendReceive + lotteryDividendSend;
      const externalDividend = externalDividendReceive + externalDividendSend;

      records.push({
        platform_name: platform.name,
        date: dateStr,
        // 詳細欄位
        lottery_wage: lotteryWage,
        lottery_rebate: lotteryRebate,
        game_ag: gameAG,
        game_chess: gameChess,
        game_rebate: gameRebate,
        game_private: gamePrivate,
        lottery_dividend_receive: lotteryDividendReceive,
        lottery_dividend_send: lotteryDividendSend,
        external_dividend_receive: externalDividendReceive,
        external_dividend_send: externalDividendSend,
        // 合併欄位（向後兼容）
        lottery_amount: lotteryAmount,
        external_game_amount: externalGameAmount,
        lottery_dividend: lotteryDividend,
        external_dividend: externalDividend,
        private_return: privateReturn,
        deposit_amount: depositAmount,
        withdrawal_amount: withdrawalAmount,
        loan_amount: loanAmount,
        profit: profit,
        balance: balance
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

    res.json({
      success: true,
      total: records.length,
      records: records,
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
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '\u7121\u6548\u7684\u8cc7\u6599' });
    }

    const currentUser = req.user;
    const now = new Date().toISOString();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // INSERT 語句（包含所有詳細欄位）
    const insertStmt = dbCall(db, 'prepare', `
      INSERT INTO platform_transactions (
        id, platform_name, date,
        lottery_wage, lottery_rebate, game_ag, game_chess, game_rebate, game_private,
        lottery_dividend_receive, lottery_dividend_send, external_dividend_receive, external_dividend_send,
        lottery_amount, external_game_amount, lottery_dividend, external_dividend,
        private_return, deposit_amount, withdrawal_amount, loan_amount, profit, balance,
        uploaded_by, uploaded_by_name, uploaded_at, upload_file_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // UPDATE 語句（包含所有詳細欄位）
    const updateStmt = dbCall(db, 'prepare', `
      UPDATE platform_transactions SET
        lottery_wage = ?, lottery_rebate = ?, game_ag = ?, game_chess = ?, game_rebate = ?, game_private = ?,
        lottery_dividend_receive = ?, lottery_dividend_send = ?, external_dividend_receive = ?, external_dividend_send = ?,
        lottery_amount = ?, external_game_amount = ?, lottery_dividend = ?, external_dividend = ?,
        private_return = ?, deposit_amount = ?, withdrawal_amount = ?, loan_amount = ?, profit = ?, balance = ?,
        last_modified_by = ?, last_modified_by_name = ?, last_modified_at = ?, updated_at = ?
      WHERE platform_name = ? AND date = ?
    `);

    for (const record of records) {
      const existing = dbCall(db, 'prepare',
        'SELECT * FROM platform_transactions WHERE platform_name = ? AND date = ?'
      ).get(record.platform_name, record.date);

      if (existing) {
        const fields = [
          'lottery_wage', 'lottery_rebate', 'game_ag', 'game_chess',
          'game_rebate', 'game_private', 'lottery_dividend_receive',
          'lottery_dividend_send', 'external_dividend_receive', 'external_dividend_send',
          'lottery_amount', 'external_game_amount', 'lottery_dividend', 'external_dividend',
          'private_return', 'deposit_amount', 'withdrawal_amount', 'loan_amount',
          'profit', 'balance'
        ];
        
        let hasChanges = false;
        for (const field of fields) {
          if (existing[field] !== record[field]) {
            hasChanges = true;
            break;
          }
        }

        if (hasChanges) {
          updateStmt.run(
            record.lottery_wage, record.lottery_rebate, record.game_ag, record.game_chess,
            record.game_rebate, record.game_private, record.lottery_dividend_receive,
            record.lottery_dividend_send, record.external_dividend_receive, record.external_dividend_send,
            record.lottery_amount, record.external_game_amount, record.lottery_dividend, record.external_dividend,
            record.private_return, record.deposit_amount, record.withdrawal_amount, record.loan_amount,
            record.profit, record.balance,
            currentUser.id, currentUser.username, now, now,
            record.platform_name, record.date
          );
          updated++;
        } else {
          skipped++;
        }
      } else {
        const id = `platform-tx-${Date.now()}-${uuidv4().slice(0, 8)}`;
        insertStmt.run(
          id, record.platform_name, record.date,
          record.lottery_wage, record.lottery_rebate, record.game_ag, record.game_chess,
          record.game_rebate, record.game_private, record.lottery_dividend_receive,
          record.lottery_dividend_send, record.external_dividend_receive, record.external_dividend_send,
          record.lottery_amount, record.external_game_amount, record.lottery_dividend, record.external_dividend,
          record.private_return, record.deposit_amount, record.withdrawal_amount, record.loan_amount,
          record.profit, record.balance,
          currentUser.id, currentUser.username, now, record.fileName || '',
          now, now
        );
        inserted++;
      }
    }

    res.json({
      success: true,
      imported: inserted + updated,
      inserted: inserted,
      updated: updated,
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
        COUNT(*) as record_count,
        SUM(lottery_wage) as total_lottery_wage,
        SUM(lottery_rebate) as total_lottery_rebate,
        SUM(game_ag) as total_game_ag,
        SUM(game_chess) as total_game_chess,
        SUM(game_rebate) as total_game_rebate,
        SUM(game_private) as total_game_private,
        SUM(lottery_dividend_receive) as total_lottery_dividend_receive,
        SUM(lottery_dividend_send) as total_lottery_dividend_send,
        SUM(external_dividend_receive) as total_external_dividend_receive,
        SUM(external_dividend_send) as total_external_dividend_send,
        SUM(lottery_amount) as total_lottery,
        SUM(external_game_amount) as total_external,
        SUM(lottery_dividend) as total_lottery_dividend,
        SUM(external_dividend) as total_external_dividend,
        SUM(private_return) as total_private_return,
        SUM(deposit_amount) as total_deposit,
        SUM(withdrawal_amount) as total_withdrawal,
        SUM(loan_amount) as total_loan,
        SUM(profit) as total_profit,
        AVG(profit) as avg_profit,
        MAX(profit) as max_profit,
        MIN(profit) as min_profit,
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

router.get('/stats/date', authenticateToken, async (req, res) => {
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

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate, actionBy, actionType } = req.query;

    let query = `
      SELECT 
        h.*,
        u.name as action_by_name
      FROM platform_transaction_history h
      LEFT JOIN users u ON h.action_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND DATE(h.action_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(h.action_at) <= ?';
      params.push(endDate);
    }

    if (actionBy) {
      query += ' AND h.action_by = ?';
      params.push(actionBy);
    }

    if (actionType) {
      query += ' AND h.action_type = ?';
      params.push(actionType);
    }

    query += ' ORDER BY h.action_at DESC LIMIT 100';

    const history = dbCall(db, 'prepare', query).all(...params);

    res.json({
      success: true,
      history: history
    });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: '\u7372\u53d6\u6b77\u53f2\u8a18\u9304\u5931\u6557' });
  }
});

module.exports = router;
