const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');

// ============================================================
// HELPERS (same pattern as service-api.js)
// ============================================================
function getRawDb(db) {
  return db.db || db;
}

function safeQuery(db, sql, params) {
  try { return params ? db.prepare(sql).all(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).all(); }
  catch (e) { console.error('[Central - Subsidiaries] DB query error:', e.message); return []; }
}

function safeGet(db, sql, params) {
  try { return params ? db.prepare(sql).get(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).get(); }
  catch (e) { console.error('[Central - Subsidiaries] DB get error:', e.message); return null; }
}

function safeRun(db, sql, params) {
  try { return params ? db.prepare(sql).run(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).run(); }
  catch (e) { console.error('[Central - Subsidiaries] DB run error:', e.message, '| SQL:', sql.substring(0, 80)); return { error: e.message }; }
}

// ============================================================
// INIT: Create subsidiaries table if not exists
// ============================================================
function initSubsidiariesTable(db) {
  const raw = getRawDb(db);
  safeRun(raw, `
    CREATE TABLE IF NOT EXISTS subsidiaries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      service_token TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_health_check TEXT,
      last_health_status TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('[Central - Subsidiaries] Table initialized');
}

// ============================================================
// MIDDLEWARE: BOSS-only access
// ============================================================
function requireBoss(req, res, next) {
  if (!req.user || req.user.role !== 'BOSS') {
    return res.status(403).json({ error: '權限不足，僅 BOSS 可操作' });
  }
  next();
}

// Apply auth middleware to all routes
router.use(authenticateToken);
router.use(requireBoss);

// ============================================================
// ENDPOINT 1: GET / — List all subsidiaries
// ============================================================
router.get('/', (req, res) => {
  try {
    const db = getRawDb(req.db);
    const subsidiaries = safeQuery(db, 'SELECT id, name, base_url, is_active, last_health_check, last_health_status, created_at, updated_at FROM subsidiaries ORDER BY created_at DESC');

    console.log(`[Central - Subsidiaries] Listed ${subsidiaries.length} subsidiaries`);
    res.json({ subsidiaries });
  } catch (error) {
    console.error('[Central - Subsidiaries] List error:', error);
    res.status(500).json({ error: 'Failed to list subsidiaries', message: error.message });
  }
});

// ============================================================
// ENDPOINT 2: POST / — Register new subsidiary
// ============================================================
router.post('/', (req, res) => {
  try {
    const { name, base_url, service_token } = req.body;

    if (!name || !base_url || !service_token) {
      return res.status(400).json({ error: '缺少必要欄位: name, base_url, service_token' });
    }

    const db = getRawDb(req.db);
    const id = `sub-${Date.now()}`;
    const now = new Date().toISOString();

    const r = safeRun(db,
      'INSERT INTO subsidiaries (id, name, base_url, service_token, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
      [id, name, base_url, service_token, now, now]
    );

    if (r?.error) {
      return res.status(500).json({ error: '註冊子公司失敗', message: r.error });
    }

    console.log(`[Central - Subsidiaries] Registered: ${name} (${id})`);
    res.status(201).json({
      message: `子公司「${name}」已註冊`,
      subsidiary: { id, name, base_url, is_active: 1, created_at: now, updated_at: now }
    });
  } catch (error) {
    console.error('[Central - Subsidiaries] Register error:', error);
    res.status(500).json({ error: 'Failed to register subsidiary', message: error.message });
  }
});

// ============================================================
// ENDPOINT 3: PUT /:id — Update subsidiary
// ============================================================
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getRawDb(req.db);

    const existing = safeGet(db, 'SELECT * FROM subsidiaries WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '找不到該子公司' });
    }

    const { name, base_url, service_token, is_active } = req.body;
    const now = new Date().toISOString();

    const updatedName = name !== undefined ? name : existing.name;
    const updatedBaseUrl = base_url !== undefined ? base_url : existing.base_url;
    const updatedServiceToken = service_token !== undefined ? service_token : existing.service_token;
    const updatedIsActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    const r = safeRun(db,
      'UPDATE subsidiaries SET name = ?, base_url = ?, service_token = ?, is_active = ?, updated_at = ? WHERE id = ?',
      [updatedName, updatedBaseUrl, updatedServiceToken, updatedIsActive, now, id]
    );

    if (r?.error) {
      return res.status(500).json({ error: '更新子公司失敗', message: r.error });
    }

    console.log(`[Central - Subsidiaries] Updated: ${updatedName} (${id})`);
    res.json({
      message: `子公司「${updatedName}」已更新`,
      subsidiary: { id, name: updatedName, base_url: updatedBaseUrl, is_active: updatedIsActive, updated_at: now }
    });
  } catch (error) {
    console.error('[Central - Subsidiaries] Update error:', error);
    res.status(500).json({ error: 'Failed to update subsidiary', message: error.message });
  }
});

// ============================================================
// ENDPOINT 4: DELETE /:id — Soft delete (set is_active = 0)
// ============================================================
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getRawDb(req.db);

    const existing = safeGet(db, 'SELECT * FROM subsidiaries WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '找不到該子公司' });
    }

    const now = new Date().toISOString();
    const r = safeRun(db, 'UPDATE subsidiaries SET is_active = 0, updated_at = ? WHERE id = ?', [now, id]);

    if (r?.error) {
      return res.status(500).json({ error: '停用子公司失敗', message: r.error });
    }

    console.log(`[Central - Subsidiaries] Soft deleted: ${existing.name} (${id})`);
    res.json({ message: `子公司「${existing.name}」已停用` });
  } catch (error) {
    console.error('[Central - Subsidiaries] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete subsidiary', message: error.message });
  }
});

// ============================================================
// ENDPOINT 5: POST /:id/health-check — Ping single subsidiary
// ============================================================
router.post('/:id/health-check', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getRawDb(req.db);

    const subsidiary = safeGet(db, 'SELECT * FROM subsidiaries WHERE id = ?', [id]);
    if (!subsidiary) {
      return res.status(404).json({ error: '找不到該子公司' });
    }

    const result = await checkSubsidiaryHealth(subsidiary);
    const now = new Date().toISOString();

    safeRun(db,
      'UPDATE subsidiaries SET last_health_check = ?, last_health_status = ?, updated_at = ? WHERE id = ?',
      [now, result.status, now, id]
    );

    console.log(`[Central - Subsidiaries] Health check ${id}: ${result.status}`);
    res.json({
      id,
      name: subsidiary.name,
      ...result,
      checked_at: now
    });
  } catch (error) {
    console.error('[Central - Subsidiaries] Health check error:', error);
    res.status(500).json({ error: 'Health check failed', message: error.message });
  }
});

// ============================================================
// ENDPOINT 6: POST /health-check-all — Check all active subsidiaries
// ============================================================
router.post('/health-check-all', async (req, res) => {
  try {
    const db = getRawDb(req.db);
    const subsidiaries = safeQuery(db, 'SELECT * FROM subsidiaries WHERE is_active = 1');

    if (subsidiaries.length === 0) {
      return res.json({ message: '沒有活躍的子公司', results: [] });
    }

    const now = new Date().toISOString();

    const results = await Promise.all(
      subsidiaries.map(async (sub) => {
        const result = await checkSubsidiaryHealth(sub);

        safeRun(db,
          'UPDATE subsidiaries SET last_health_check = ?, last_health_status = ?, updated_at = ? WHERE id = ?',
          [now, result.status, now, sub.id]
        );

        return {
          id: sub.id,
          name: sub.name,
          ...result,
          checked_at: now
        };
      })
    );

    const onlineCount = results.filter(r => r.status === 'online').length;
    console.log(`[Central - Subsidiaries] Health check all: ${onlineCount}/${results.length} online`);

    res.json({
      total: results.length,
      online: onlineCount,
      offline: results.length - onlineCount,
      results
    });
  } catch (error) {
    console.error('[Central - Subsidiaries] Health check all error:', error);
    res.status(500).json({ error: 'Health check all failed', message: error.message });
  }
});

// ============================================================
// HELPER: Check single subsidiary health
// ============================================================
async function checkSubsidiaryHealth(subsidiary) {
  try {
    const url = `${subsidiary.base_url.replace(/\/+$/, '')}/api/service/health`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `ServiceToken ${subsidiary.service_token}`
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { status: 'error', detail: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { status: data.status || 'online', detail: data };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { status: 'timeout', detail: 'Health check timed out (10s)' };
    }
    return { status: 'offline', detail: error.message };
  }
}

// Export router and init function
module.exports = { router, initSubsidiariesTable };
