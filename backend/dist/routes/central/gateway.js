const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');

// ============================================================
// HELPERS
// ============================================================
function getRawDb(db) {
  return db.db || db;
}

function safeGet(db, sql, params) {
  try { return params ? db.prepare(sql).get(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).get(); }
  catch (e) { console.error('[Gateway] DB get error:', e.message); return null; }
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
// ALL /api/central/gateway/:companyId/* — Proxy to subsidiary
// ============================================================
router.all('/:companyId/*', async (req, res) => {
  try {
    const { companyId } = req.params;
    const db = getRawDb(req.db);

    // Look up subsidiary
    const subsidiary = safeGet(db, 'SELECT * FROM subsidiaries WHERE id = ?', [companyId]);
    if (!subsidiary) {
      return res.status(404).json({ error: '找不到該子公司', companyId });
    }

    if (!subsidiary.is_active) {
      return res.status(404).json({ error: '該子公司已停用', companyId });
    }

    // Build target URL — extract remaining path after companyId
    // req.params[0] contains everything after /:companyId/
    const remainingPath = req.params[0];
    const baseUrl = subsidiary.base_url.replace(/\/+$/, '');
    const targetUrl = `${baseUrl}/api/${remainingPath}`;

    console.log(`[Gateway] ${req.method} ${targetUrl} (company: ${subsidiary.name})`);

    // Build fetch options
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': `ServiceToken ${subsidiary.service_token}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    };

    // Forward body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeout);

    // Stream response back
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const responseData = await response.text();
    console.log(`[Gateway] Response ${response.status} from ${subsidiary.name}`);

    res.status(response.status).send(responseData);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[Gateway] Timeout proxying to subsidiary`);
      return res.status(502).json({ error: '子公司離線，請聯繫技術人員' });
    }

    console.error('[Gateway] Proxy error:', error.message);
    res.status(502).json({ error: '子公司離線，請聯繫技術人員' });
  }
});

module.exports = router;
