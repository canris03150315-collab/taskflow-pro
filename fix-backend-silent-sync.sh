#!/bin/bash
# 備份原始檔案
docker exec taskflow-pro cp /app/dist/routes/platform-revenue.js /app/dist/routes/platform-revenue.js.backup

# 使用 Node.js 進行修改
docker exec taskflow-pro node -e "
const fs = require('fs');
const filePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到 /parse 路由的開始和結束位置
const parseStart = content.indexOf('router.post(\'/parse\'');
const parseEnd = content.indexOf('router.post(\'/import\'', parseStart);

if (parseStart === -1 || parseEnd === -1) {
  console.log('Error: Could not find parse route');
  process.exit(1);
}

// 提取 /parse 路由之前的內容
const beforeParse = content.substring(0, parseStart);

// 新的 /parse 路由
const newParse = \`router.post('/parse', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const db = req.db;
    
    if (!req.file) {
      return res.status(400).json({ error: '請上傳檔案' });
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
    res.status(500).json({ error: '解析失敗' });
  }
});

\`;

// 提取 /import 路由之後的內容
const afterImport = content.substring(parseEnd);

// 新的 /import 路由
const newImport = \`router.post('/import', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '無效的資料' });
    }

    const currentUser = req.user;
    const now = new Date().toISOString();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const insertStmt = dbCall(db, 'prepare', \\\`
      INSERT INTO platform_transactions (
        id, platform_name, date,
        lottery_wage, lottery_rebate, game_ag, game_chess, game_rebate, game_private,
        lottery_dividend_receive, lottery_dividend_send, external_dividend_receive, external_dividend_send,
        lottery_amount, external_game_amount, lottery_dividend, external_dividend,
        private_return, deposit_amount, withdrawal_amount, loan_amount, profit, balance,
        uploaded_by, uploaded_by_name, uploaded_at, upload_file_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \\\`);

    const updateStmt = dbCall(db, 'prepare', \\\`
      UPDATE platform_transactions SET
        lottery_wage = ?, lottery_rebate = ?, game_ag = ?, game_chess = ?, game_rebate = ?, game_private = ?,
        lottery_dividend_receive = ?, lottery_dividend_send = ?, external_dividend_receive = ?, external_dividend_send = ?,
        lottery_amount = ?, external_game_amount = ?, lottery_dividend = ?, external_dividend = ?,
        private_return = ?, deposit_amount = ?, withdrawal_amount = ?, loan_amount = ?, profit = ?, balance = ?,
        last_modified_by = ?, last_modified_by_name = ?, last_modified_at = ?, updated_at = ?
      WHERE platform_name = ? AND date = ?
    \\\`);

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
        const id = \\\`platform-tx-\\\${Date.now()}-\\\${uuidv4().slice(0, 8)}\\\`;
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
    res.status(500).json({ error: '匯入失敗' });
  }
});

\`;

// 組合新內容
const newContent = beforeParse + newParse + newImport + afterImport;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Backend updated successfully');
"

# 重啟容器
docker restart taskflow-pro
