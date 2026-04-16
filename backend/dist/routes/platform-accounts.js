const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ============================================================
// HELPERS
// ============================================================
function getRawDb(db) {
  return db.db ? db.db : db;
}

function safeRun(db, sql, params = []) {
  try {
    const raw = getRawDb(db);
    return raw.prepare(sql).run(...params);
  } catch (e) {
    console.error('[Platform] DB error:', e.message);
    return { error: e.message };
  }
}

function safeGet(db, sql, params = []) {
  try {
    const raw = getRawDb(db);
    return raw.prepare(sql).get(...params);
  } catch (e) {
    return null;
  }
}

function safeAll(db, sql, params = []) {
  try {
    const raw = getRawDb(db);
    return raw.prepare(sql).all(...params);
  } catch (e) {
    return [];
  }
}

// ============================================================
// DB INIT
// ============================================================
let tablesInitialized = false;

function initPlatformTables(db) {
  const raw = getRawDb(db);

  // Drop old tables with wrong schema (one-time, v1 migration)
  try {
    const hasBadSchema = raw.prepare("SELECT sql FROM sqlite_master WHERE name='platform_daily_records' AND sql LIKE '%UNIQUE%'").get();
    if (hasBadSchema) {
      console.log('[Platform] Dropping old tables with UNIQUE constraint...');
      raw.prepare('DROP TABLE IF EXISTS platform_daily_records').run();
      raw.prepare('DROP TABLE IF EXISTS platform_definitions').run();
      raw.prepare('DROP TABLE IF EXISTS platform_upload_batches').run();
      raw.prepare('DROP TABLE IF EXISTS platform_initial_balances').run();
    }
  } catch(e) { /* table doesn't exist yet, fine */ }

  // 平台定義表
  raw.prepare(`CREATE TABLE IF NOT EXISTS platform_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'manager' CHECK (type IN ('manager', 'merchant', 'dividend', 'other')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  try { raw.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_def_name ON platform_definitions(name)`).run(); } catch(e) {}

  // 平台每日帳務紀錄
  raw.prepare(`CREATE TABLE IF NOT EXISTS platform_daily_records (
    id TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL,
    platform_name TEXT NOT NULL,
    record_date TEXT NOT NULL,
    record_month TEXT NOT NULL,
    day_of_month INTEGER NOT NULL,
    lottery_salary REAL DEFAULT 0,
    lottery_rebate REAL DEFAULT 0,
    live_ag REAL DEFAULT 0,
    chess_card REAL DEFAULT 0,
    external_rebate REAL DEFAULT 0,
    live_private_rebate REAL DEFAULT 0,
    lottery_dividend_received REAL DEFAULT 0,
    lottery_dividend_distributed REAL DEFAULT 0,
    external_dividend_received REAL DEFAULT 0,
    external_dividend_distributed REAL DEFAULT 0,
    private_rebate REAL DEFAULT 0,
    deposit REAL DEFAULT 0,
    withdrawal REAL DEFAULT 0,
    loan REAL DEFAULT 0,
    profit REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    uploaded_by TEXT NOT NULL,
    upload_batch_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();

  // 上傳批次紀錄
  raw.prepare(`CREATE TABLE IF NOT EXISTS platform_upload_batches (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    record_month TEXT NOT NULL,
    platforms_count INTEGER DEFAULT 0,
    records_count INTEGER DEFAULT 0,
    uploaded_by TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TEXT NOT NULL
  )`).run();

  // 平台初始餘額
  raw.prepare(`CREATE TABLE IF NOT EXISTS platform_initial_balances (
    id TEXT PRIMARY KEY,
    platform_name TEXT NOT NULL,
    record_month TEXT NOT NULL,
    balance REAL DEFAULT 0,
    upload_batch_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(platform_name, record_month)
  )`).run();
}

function ensureTables(db) {
  if (!tablesInitialized) {
    initPlatformTables(db);
    tablesInitialized = true;
  }
}

// ============================================================
// EXCEL PARSER — Auto-detect platform blocks
// ============================================================

// Each platform block structure (from the platform name column):
// [日期/平台名, 工资, 反点, 真人AG, 棋牌, 外接返点, 真人私返, 领取分红, 下发分红, 领取分红, 下发分红, 私返, 充值, 提款, 借款, 营利, 馀额, spacer]
// startCol points to the platform name cell (which is also the date column in data rows)

// Column offsets within a block (0-based from startCol)
const COL = {
  DATE: 0,              // 日期 (same column as platform name)
  LOTTERY_SALARY: 1,    // 工资
  LOTTERY_REBATE: 2,    // 反点
  LIVE_AG: 3,           // 真人AG
  CHESS_CARD: 4,        // 棋牌
  EXTERNAL_REBATE: 5,   // 外接返点
  LIVE_PRIVATE: 6,      // 真人私返
  LOTTERY_DIV_RECV: 7,  // 彩票分红-领取
  LOTTERY_DIV_DIST: 8,  // 彩票分红-下发
  EXT_DIV_RECV: 9,      // 外接分红-领取
  EXT_DIV_DIST: 10,     // 外接分红-下发
  PRIVATE_REBATE: 11,   // 私返
  DEPOSIT: 12,          // 充值
  WITHDRAWAL: 13,       // 提款
  LOAN: 14,             // 借款
  PROFIT: 15,           // 营利
  BALANCE: 16           // 馀额
};

function parseExcelBuffer(buffer, yearMonth) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (data.length < 4) {
    throw new Error('Excel 格式錯誤：資料不足');
  }

  // Row 0: Platform names — scan for non-null cells to detect blocks
  const row0 = data[0] || [];
  const platforms = [];

  // Detect platform blocks by scanning row 0 for platform names
  for (let col = 0; col < row0.length; col++) {
    const cellVal = row0[col];
    if (cellVal && typeof cellVal === 'string' && cellVal.trim()) {
      const name = cellVal.trim().replace(/\t/g, '').replace(/\s+/g, '');
      // Determine type from name
      let type = 'manager';
      if (name.includes('招商')) type = 'merchant';
      else if (name.includes('分红') || name.includes('分紅')) type = 'dividend';

      // Detect status from name
      let status = 'active';
      let cleanName = name;
      if (name.includes('停運') || name.includes('停运')) {
        status = 'suspended';
      } else if (name.includes('改直營') || name.includes('改直营')) {
        status = 'inactive';
      }

      platforms.push({
        name: cleanName,
        type,
        status,
        startCol: col
      });
    }
  }

  if (platforms.length === 0) {
    throw new Error('Excel 格式錯誤：未偵測到任何平台名稱（第一行）');
  }

  console.log(`[Platform Parser] Detected ${platforms.length} platforms:`, platforms.map(p => p.name));

  // Row 3: Initial balances (初始餘額)
  const row3 = data[3] || [];
  const initialBalances = {};
  for (const platform of platforms) {
    const balVal = row3[platform.startCol + COL.BALANCE];
    initialBalances[platform.name] = typeof balVal === 'number' ? balVal : 0;
  }

  // Row 4+: Daily records (day 1-31)
  const records = [];
  for (let rowIdx = 4; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx] || [];

    for (const platform of platforms) {
      const base = platform.startCol;
      const dayNum = row[base + COL.DATE];

      // Skip rows without a valid day number
      if (typeof dayNum !== 'number' || dayNum < 1 || dayNum > 31) continue;

      const getNum = (offset) => {
        const val = row[base + offset];
        return typeof val === 'number' ? val : 0;
      };

      // Check if entire row is zeros (skip empty days)
      const values = [
        getNum(COL.LOTTERY_SALARY), getNum(COL.LOTTERY_REBATE),
        getNum(COL.LIVE_AG), getNum(COL.CHESS_CARD),
        getNum(COL.EXTERNAL_REBATE), getNum(COL.LIVE_PRIVATE),
        getNum(COL.LOTTERY_DIV_RECV), getNum(COL.LOTTERY_DIV_DIST),
        getNum(COL.EXT_DIV_RECV), getNum(COL.EXT_DIV_DIST),
        getNum(COL.PRIVATE_REBATE), getNum(COL.DEPOSIT),
        getNum(COL.WITHDRAWAL), getNum(COL.LOAN),
        getNum(COL.PROFIT), getNum(COL.BALANCE)
      ];

      // Build date string
      const day = String(Math.floor(dayNum)).padStart(2, '0');
      const recordDate = `${yearMonth}-${day}`;

      records.push({
        platform_name: platform.name,
        platform_type: platform.type,
        platform_status: platform.status,
        record_date: recordDate,
        record_month: yearMonth,
        day_of_month: Math.floor(dayNum),
        lottery_salary: values[0],
        lottery_rebate: values[1],
        live_ag: values[2],
        chess_card: values[3],
        external_rebate: values[4],
        live_private_rebate: values[5],
        lottery_dividend_received: values[6],
        lottery_dividend_distributed: values[7],
        external_dividend_received: values[8],
        external_dividend_distributed: values[9],
        private_rebate: values[10],
        deposit: values[11],
        withdrawal: values[12],
        loan: values[13],
        profit: values[14],
        balance: values[15]
      });
    }
  }

  // Deduplicate: keep last occurrence for each (platform_name, record_date) pair
  const seen = new Map();
  for (const r of records) {
    const key = `${r.platform_name}|${r.record_date}`;
    seen.set(key, r);
  }
  const dedupedRecords = Array.from(seen.values());
  console.log(`[Platform Parser] ${records.length} raw records → ${dedupedRecords.length} deduped`);

  return { platforms, initialBalances, records: dedupedRecords };
}

// ============================================================
// MULTER CONFIG
// ============================================================
const uploadDir = path.join(__dirname, '..', 'data', 'uploads', 'platform');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只接受 .xlsx 或 .xls 檔案'));
    }
  }
});

// ============================================================
// ROUTES
// ============================================================

// POST /upload-preview — Upload Excel and get preview (no DB write)
router.post('/upload-preview', authenticateToken, upload.single('file'), (req, res) => {
  try {
    ensureTables(req.db);
    if (!req.file) return res.status(400).json({ error: '未上傳檔案' });

    const yearMonth = req.body.yearMonth; // e.g. "2026-03"
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: '請指定年月（格式：YYYY-MM）' });
    }

    const { platforms, initialBalances, records } = parseExcelBuffer(req.file.buffer, yearMonth);

    // Return preview data
    res.json({
      success: true,
      preview: {
        fileName: req.file.originalname,
        yearMonth,
        platformCount: platforms.length,
        recordCount: records.length,
        platforms: platforms.map(p => ({
          name: p.name,
          type: p.type,
          status: p.status,
          initialBalance: initialBalances[p.name] || 0,
          recordCount: records.filter(r => r.platform_name === p.name).length,
          hasData: records.filter(r => r.platform_name === p.name).some(r =>
            r.lottery_salary || r.lottery_rebate || r.live_ag || r.chess_card ||
            r.deposit || r.withdrawal || r.profit
          )
        })),
        sampleRecords: records.filter(r => {
          // Show first 3 days of first platform with data
          return r.day_of_month <= 3;
        }).slice(0, 15)
      },
      // Store full data in memory for confirm step — encode as base64
      pendingData: Buffer.from(JSON.stringify({ platforms, initialBalances, records, yearMonth })).toString('base64')
    });
  } catch (e) {
    console.error('[Platform Upload] Error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// POST /upload-confirm — Confirm and write to DB
router.post('/upload-confirm', authenticateToken, (req, res) => {
  try {
    ensureTables(req.db);
    const { pendingData } = req.body;
    if (!pendingData) return res.status(400).json({ error: '無待確認資料' });

    const { platforms, initialBalances, records, yearMonth } = JSON.parse(
      Buffer.from(pendingData, 'base64').toString('utf8')
    );

    const db = getRawDb(req.db);
    const now = new Date().toISOString();
    const batchId = uuidv4();
    const userId = req.user.id;

    // Start transaction
    const transaction = db.transaction(() => {
      // 1. Upsert platform definitions
      const upsertPlatform = db.prepare(`
        INSERT INTO platform_definitions (id, name, type, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, '', ?, ?)
        ON CONFLICT(name) DO UPDATE SET type=excluded.type, status=excluded.status, updated_at=excluded.updated_at
      `);

      for (const p of platforms) {
        upsertPlatform.run(uuidv4(), p.name, p.type, p.status, now, now);
      }

      // 2. Keep old records (version history) — no delete
      // Mark previous batches for this month as 'superseded'
      db.prepare("UPDATE platform_upload_batches SET status = 'superseded' WHERE record_month = ? AND status = 'completed'").run(yearMonth);

      // 3. Insert initial balances (replace if same month+platform already exists)
      db.prepare('DELETE FROM platform_initial_balances WHERE record_month = ?').run(yearMonth);
      const insertBalance = db.prepare(`
        INSERT INTO platform_initial_balances (id, platform_name, record_month, balance, upload_batch_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const [name, balance] of Object.entries(initialBalances)) {
        insertBalance.run(uuidv4(), name, yearMonth, balance, batchId, now);
      }

      // 4. Insert daily records
      const insertRecord = db.prepare(`
        INSERT INTO platform_daily_records (
          id, platform_id, platform_name, record_date, record_month, day_of_month,
          lottery_salary, lottery_rebate, live_ag, chess_card, external_rebate, live_private_rebate,
          lottery_dividend_received, lottery_dividend_distributed,
          external_dividend_received, external_dividend_distributed,
          private_rebate, deposit, withdrawal, loan, profit, balance,
          uploaded_by, upload_batch_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Get platform IDs
      const getPlatformId = db.prepare('SELECT id FROM platform_definitions WHERE name = ?');

      for (const r of records) {
        const platform = getPlatformId.get(r.platform_name);
        const platformId = platform ? platform.id : 'unknown';
        insertRecord.run(
          uuidv4(), platformId, r.platform_name, r.record_date, r.record_month, r.day_of_month,
          r.lottery_salary, r.lottery_rebate, r.live_ag, r.chess_card, r.external_rebate, r.live_private_rebate,
          r.lottery_dividend_received, r.lottery_dividend_distributed,
          r.external_dividend_received, r.external_dividend_distributed,
          r.private_rebate, r.deposit, r.withdrawal, r.loan, r.profit, r.balance,
          userId, batchId, now, now
        );
      }

      // 5. Record upload batch
      db.prepare(`
        INSERT INTO platform_upload_batches (id, file_name, record_month, platforms_count, records_count, uploaded_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(batchId, req.body.fileName || 'unknown.xlsx', yearMonth, platforms.length, records.length, userId, now);
    });

    transaction();

    res.json({
      success: true,
      message: `成功匯入 ${yearMonth} 帳務資料`,
      batchId,
      platformCount: platforms.length,
      recordCount: records.length
    });
  } catch (e) {
    console.error('[Platform Upload Confirm] Error:', e.message);
    res.status(500).json({ error: `匯入失敗: ${e.message}` });
  }
});

// Helper: get latest batch ID for a month
function getLatestBatchId(db, month) {
  const batch = db.prepare(
    "SELECT id FROM platform_upload_batches WHERE record_month = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1"
  ).get(month);
  return batch ? batch.id : null;
}

// GET /records — Query platform daily records (latest version by default)
router.get('/records', authenticateToken, (req, res) => {
  try {
    ensureTables(req.db);
    const { month, platform, startDate, endDate, batchId } = req.query;
    const db = getRawDb(req.db);

    let query = 'SELECT * FROM platform_daily_records WHERE 1=1';
    const params = [];

    // If batchId specified, show that version; otherwise show latest
    if (batchId) {
      query += ' AND upload_batch_id = ?';
      params.push(batchId);
    } else if (month) {
      const latestBatch = getLatestBatchId(db, month);
      if (latestBatch) {
        query += ' AND upload_batch_id = ?';
        params.push(latestBatch);
      } else {
        return res.json({ success: true, records: [], count: 0 });
      }
    }

    if (month) {
      query += ' AND record_month = ?';
      params.push(month);
    }
    if (platform) {
      query += ' AND platform_name LIKE ?';
      params.push(`%${platform}%`);
    }
    if (startDate) {
      query += ' AND record_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND record_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY platform_name, record_date';
    const records = db.prepare(query).all(...params);

    res.json({ success: true, records, count: records.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /platforms — List all platforms
router.get('/platforms', authenticateToken, (req, res) => {
  try {
    ensureTables(req.db);
    const db = getRawDb(req.db);
    const platforms = db.prepare('SELECT * FROM platform_definitions ORDER BY name').all();
    res.json({ success: true, platforms });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /summary — Get monthly summary per platform (latest version)
router.get('/summary', authenticateToken, (req, res) => {
  try {
    ensureTables(req.db);
    const { month, batchId } = req.query;
    if (!month) return res.status(400).json({ error: '請指定月份（month=YYYY-MM）' });

    const db = getRawDb(req.db);

    // Use specified batch or latest
    const targetBatch = batchId || getLatestBatchId(db, month);
    if (!targetBatch) return res.json({ success: true, summary: [], month, batchId: null });

    const summary = db.prepare(`
      SELECT
        platform_name,
        COUNT(*) as days_with_data,
        SUM(lottery_salary) as total_lottery_salary,
        SUM(lottery_rebate) as total_lottery_rebate,
        SUM(live_ag) as total_live_ag,
        SUM(chess_card) as total_chess_card,
        SUM(external_rebate) as total_external_rebate,
        SUM(live_private_rebate) as total_live_private_rebate,
        SUM(lottery_dividend_received) as total_lottery_div_recv,
        SUM(lottery_dividend_distributed) as total_lottery_div_dist,
        SUM(external_dividend_received) as total_ext_div_recv,
        SUM(external_dividend_distributed) as total_ext_div_dist,
        SUM(private_rebate) as total_private_rebate,
        SUM(deposit) as total_deposit,
        SUM(withdrawal) as total_withdrawal,
        SUM(loan) as total_loan,
        SUM(profit) as total_profit,
        MAX(balance) as latest_balance
      FROM platform_daily_records
      WHERE record_month = ? AND upload_batch_id = ?
      GROUP BY platform_name
      ORDER BY platform_name
    `).all(month, targetBatch);

    // Get initial balances for this batch
    const balances = db.prepare(
      'SELECT platform_name, balance FROM platform_initial_balances WHERE record_month = ? AND upload_batch_id = ?'
    ).all(month, targetBatch);
    const balanceMap = {};
    balances.forEach(b => balanceMap[b.platform_name] = b.balance);

    const result = summary.map(s => ({
      ...s,
      initial_balance: balanceMap[s.platform_name] || 0
    }));

    res.json({ success: true, summary: result, month, batchId: targetBatch });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /upload-history — List upload batches
router.get('/upload-history', authenticateToken, (req, res) => {
  try {
    ensureTables(req.db);
    const db = getRawDb(req.db);
    const batches = db.prepare(
      'SELECT * FROM platform_upload_batches ORDER BY created_at DESC LIMIT 50'
    ).all();
    res.json({ success: true, batches });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /records/:month — Delete all records for a month
router.delete('/records/:month', authenticateToken, requireRole(['BOSS', 'MANAGER']), (req, res) => {
  try {
    ensureTables(req.db);
    const { month } = req.params;
    const db = getRawDb(req.db);

    const deleted = db.prepare('DELETE FROM platform_daily_records WHERE record_month = ?').run(month);
    db.prepare('DELETE FROM platform_initial_balances WHERE record_month = ?').run(month);

    res.json({ success: true, message: `已刪除 ${month} 的 ${deleted.changes} 筆紀錄` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /grand-total — Cross-platform totals for a month (latest version)
router.get('/grand-total', authenticateToken, (req, res) => {
  try {
    ensureTables(req.db);
    const { month, batchId } = req.query;
    if (!month) return res.status(400).json({ error: '請指定月份' });

    const db = getRawDb(req.db);
    const targetBatch = batchId || getLatestBatchId(db, month);
    if (!targetBatch) return res.json({ success: true, total: { platform_count: 0, total_records: 0 }, month });

    const total = db.prepare(`
      SELECT
        COUNT(DISTINCT platform_name) as platform_count,
        COUNT(*) as total_records,
        SUM(deposit) as total_deposit,
        SUM(withdrawal) as total_withdrawal,
        SUM(profit) as total_profit,
        SUM(loan) as total_loan,
        SUM(lottery_salary + lottery_rebate) as total_lottery,
        SUM(live_ag + chess_card + external_rebate + live_private_rebate) as total_external_games,
        SUM(lottery_dividend_received + external_dividend_received) as total_dividends_received,
        SUM(lottery_dividend_distributed + external_dividend_distributed) as total_dividends_distributed
      FROM platform_daily_records
      WHERE record_month = ? AND upload_batch_id = ?
    `).get(month, targetBatch);

    res.json({ success: true, total, month });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /versions — List all versions for a month
router.get('/versions', authenticateToken, (req, res) => {
  try {
    ensureTables(req.db);
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: '請指定月份' });

    const db = getRawDb(req.db);
    const versions = db.prepare(`
      SELECT id, file_name, record_month, platforms_count, records_count, uploaded_by, status, created_at
      FROM platform_upload_batches
      WHERE record_month = ?
      ORDER BY created_at DESC
    `).all(month);

    res.json({ success: true, versions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /diff — Compare two batches
router.get('/diff', authenticateToken, (req, res) => {
  try {
    ensureTables(req.db);
    const { batchA, batchB } = req.query;
    if (!batchA || !batchB) return res.status(400).json({ error: '需要 batchA 和 batchB 參數' });

    const db = getRawDb(req.db);

    const recordsA = db.prepare(
      'SELECT platform_name, day_of_month, lottery_salary, lottery_rebate, live_ag, chess_card, external_rebate, live_private_rebate, lottery_dividend_received, lottery_dividend_distributed, external_dividend_received, external_dividend_distributed, private_rebate, deposit, withdrawal, loan, profit, balance FROM platform_daily_records WHERE upload_batch_id = ? ORDER BY platform_name, day_of_month'
    ).all(batchA);

    const recordsB = db.prepare(
      'SELECT platform_name, day_of_month, lottery_salary, lottery_rebate, live_ag, chess_card, external_rebate, live_private_rebate, lottery_dividend_received, lottery_dividend_distributed, external_dividend_received, external_dividend_distributed, private_rebate, deposit, withdrawal, loan, profit, balance FROM platform_daily_records WHERE upload_batch_id = ? ORDER BY platform_name, day_of_month'
    ).all(batchB);

    // Build maps
    const mapA = {};
    recordsA.forEach(r => { mapA[`${r.platform_name}|${r.day_of_month}`] = r; });
    const mapB = {};
    recordsB.forEach(r => { mapB[`${r.platform_name}|${r.day_of_month}`] = r; });

    const allKeys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    const diffs = [];
    const numFields = ['lottery_salary', 'lottery_rebate', 'live_ag', 'chess_card', 'external_rebate', 'live_private_rebate', 'lottery_dividend_received', 'lottery_dividend_distributed', 'external_dividend_received', 'external_dividend_distributed', 'private_rebate', 'deposit', 'withdrawal', 'loan', 'profit', 'balance'];

    for (const key of allKeys) {
      const a = mapA[key];
      const b = mapB[key];
      const [platform, day] = key.split('|');

      if (!a) {
        diffs.push({ platform, day: parseInt(day), type: 'added', changes: numFields.map(f => ({ field: f, old: 0, new: b[f] })).filter(c => c.new !== 0) });
      } else if (!b) {
        diffs.push({ platform, day: parseInt(day), type: 'removed', changes: numFields.map(f => ({ field: f, old: a[f], new: 0 })).filter(c => c.old !== 0) });
      } else {
        const changes = numFields.map(f => ({ field: f, old: a[f], new: b[f] })).filter(c => c.old !== c.new);
        if (changes.length > 0) {
          diffs.push({ platform, day: parseInt(day), type: 'changed', changes });
        }
      }
    }

    res.json({
      success: true,
      totalA: recordsA.length,
      totalB: recordsB.length,
      diffCount: diffs.length,
      diffs: diffs.sort((a, b) => a.platform.localeCompare(b.platform) || a.day - b.day)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
