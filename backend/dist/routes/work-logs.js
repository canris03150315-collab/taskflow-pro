// work-logs.js - Work Log Routes (Pure ASCII)
// Purpose: Manage daily work logs with department and user filtering

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const fileStorage = require('../services/fileStorage');
const path = require('path');

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES_PER_SECTION = 10;
const VALID_SECTIONS = new Set(['today', 'tomorrow', 'notes']);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
});

// Wrap multer to surface LIMIT_FILE_SIZE as a friendly 413 instead of 500
function imageUploadWithErrorHandling(req, res, next) {
  imageUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: '圖片太大（上限 10 MB）' });
      }
      console.error('[work-logs] multer error:', err.code, err.message);
      return res.status(400).json({ error: '上傳失敗：' + (err.message || err.code || 'unknown') });
    }
    next();
  });
}

function parseImages(jsonStr) {
  if (!jsonStr) return { today: [], tomorrow: [], notes: [] };
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      today: Array.isArray(parsed.today) ? parsed.today : [],
      tomorrow: Array.isArray(parsed.tomorrow) ? parsed.tomorrow : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return { today: [], tomorrow: [], notes: [] };
  }
}

// Helper function for database calls
async function dbCall(db, method, query, params = []) {
  if (db.prepare) {
    const stmt = db.prepare(query);
    if (method === 'get') return stmt.get(...params);
    if (method === 'all') return stmt.all(...params);
    if (method === 'run') return stmt.run(...params);
  } else {
    if (method === 'get') return await db.get(query, params);
    if (method === 'all') return await db.all(query, params);
    if (method === 'run') return await db.run(query, params);
  }
}

// GET /api/work-logs - Get work logs with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { departmentId, userId, date, startDate, endDate } = req.query;

    let query = `
      SELECT 
        wl.*,
        u.name as user_name,
        d.name as department_name
      FROM work_logs wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN departments d ON wl.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    // Permission-based filtering
    if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') {
      // Can view all departments
      if (departmentId && departmentId !== 'ALL') {
        query += ' AND wl.department_id = ?';
        params.push(departmentId);
      }
    } else if (currentUser.role === 'SUPERVISOR') {
      // Can only view own department
      query += ' AND wl.department_id = ?';
      params.push(currentUser.department);
    } else {
      // Regular employees can only view their own logs
      query += ' AND wl.user_id = ?';
      params.push(currentUser.id);
    }

    // User filter
    if (userId && userId !== 'ALL') {
      query += ' AND wl.user_id = ?';
      params.push(userId);
    }

    // Date filters
    if (date) {
      query += ' AND wl.date = ?';
      params.push(date);
    } else if (startDate && endDate) {
      query += ' AND wl.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY wl.date DESC, wl.created_at DESC';

    const logs = await dbCall(db, 'all', query, params) || [];

    // Map to camelCase
    const mappedLogs = logs.map(log => ({
      id: log.id,
      userId: log.user_id,
      userName: log.user_name,
      departmentId: log.department_id,
      departmentName: log.department_name,
      date: log.date,
      todayTasks: log.today_tasks,
      tomorrowTasks: log.tomorrow_tasks,
      notes: log.notes || '',
      createdAt: log.created_at,
      updatedAt: log.updated_at,
      images: parseImages(log.images),
    }));

    res.json({ logs: mappedLogs });
  } catch (error) {
    console.error('Error fetching work logs:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/work-logs - Create new work log
router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { date, todayTasks, tomorrowTasks, notes } = req.body;

    // Validation
    if (!date || !todayTasks || !tomorrowTasks) {
      return res.status(400).json({ error: '請填寫日期、今日任務及明日計畫' });
    }
    const FIELD_LIMIT = 2000;
    if (todayTasks.length > FIELD_LIMIT || tomorrowTasks.length > FIELD_LIMIT || (notes && notes.length > FIELD_LIMIT)) {
      return res.status(400).json({ error: `每段最多 ${FIELD_LIMIT} 字、請精簡內容` });
    }

    // Check if log already exists for this user and date
    const existing = await dbCall(db, 'get',
      'SELECT id FROM work_logs WHERE user_id = ? AND date = ?',
      [currentUser.id, date]
    );

    if (existing) {
      return res.status(400).json({ error: '該日期已有工作日誌' });
    }

    const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await dbCall(db, 'run', `
      INSERT INTO work_logs (
        id, user_id, department_id, date, 
        today_tasks, tomorrow_tasks, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      currentUser.id,
      currentUser.department,
      date,
      todayTasks,
      tomorrowTasks,
      notes || '',
      now,
      now
    ]);

    // Get the created log with user and department names
    const log = await dbCall(db, 'get', `
      SELECT 
        wl.*,
        u.name as user_name,
        d.name as department_name
      FROM work_logs wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN departments d ON wl.department_id = d.id
      WHERE wl.id = ?
    `, [id]);

    const mappedLog = {
      id: log.id,
      userId: log.user_id,
      userName: log.user_name,
      departmentId: log.department_id,
      departmentName: log.department_name,
      date: log.date,
      todayTasks: log.today_tasks,
      tomorrowTasks: log.tomorrow_tasks,
      notes: log.notes || '',
      createdAt: log.created_at,
      updatedAt: log.updated_at,
      images: parseImages(log.images),
    };

    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('work_log_created', mappedLog);
    }

    res.json({ success: true, log: mappedLog });
  } catch (error) {
    console.error('Error creating work log:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// PUT /api/work-logs/:id - Update work log
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { todayTasks, tomorrowTasks, notes } = req.body;

    // Check if log exists and belongs to current user
    const existing = await dbCall(db, 'get',
      'SELECT * FROM work_logs WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: '找不到該工作日誌' });
    }

    if (existing.user_id !== currentUser.id) {
      return res.status(403).json({ error: '只能編輯自己的工作日誌' });
    }

    const FIELD_LIMIT = 2000;
    if ((todayTasks && todayTasks.length > FIELD_LIMIT) ||
        (tomorrowTasks && tomorrowTasks.length > FIELD_LIMIT) ||
        (notes && notes.length > FIELD_LIMIT)) {
      return res.status(400).json({ error: `每段最多 ${FIELD_LIMIT} 字、請精簡內容` });
    }

    const now = new Date().toISOString();
    const updates = [];
    const params = [];

    if (todayTasks !== undefined) {
      updates.push('today_tasks = ?');
      params.push(todayTasks);
    }
    if (tomorrowTasks !== undefined) {
      updates.push('tomorrow_tasks = ?');
      params.push(tomorrowTasks);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await dbCall(db, 'run',
      `UPDATE work_logs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated log
    const log = await dbCall(db, 'get', `
      SELECT 
        wl.*,
        u.name as user_name,
        d.name as department_name
      FROM work_logs wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN departments d ON wl.department_id = d.id
      WHERE wl.id = ?
    `, [id]);

    const mappedLog = {
      id: log.id,
      userId: log.user_id,
      userName: log.user_name,
      departmentId: log.department_id,
      departmentName: log.department_name,
      date: log.date,
      todayTasks: log.today_tasks,
      tomorrowTasks: log.tomorrow_tasks,
      notes: log.notes || '',
      createdAt: log.created_at,
      updatedAt: log.updated_at,
      images: parseImages(log.images),
    };

    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('work_log_updated', mappedLog);
    }

    res.json({ success: true, log: mappedLog });
  } catch (error) {
    console.error('Error updating work log:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// DELETE /api/work-logs/:id - Delete work log
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;

    // Check if log exists and belongs to current user
    const existing = await dbCall(db, 'get',
      'SELECT * FROM work_logs WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: '找不到該工作日誌' });
    }

    const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    if (existing.user_id !== currentUser.id && !isManager) {
      return res.status(403).json({ error: '只能刪除自己的工作日誌' });
    }

    await dbCall(db, 'run', 'DELETE FROM work_logs WHERE id = ?', [id]);

    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('work_log_deleted', { id });
    }

    res.json({ success: true, message: '工作日誌已刪除' });
  } catch (error) {
    console.error('Error deleting work log:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/work-logs/:id/images - Upload image to specific section
router.post('/:id/images', authenticateToken, imageUploadWithErrorHandling, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const section = req.body.section;

    if (!req.file) return res.status(400).json({ error: '請選擇圖片檔案' });
    if (!VALID_SECTIONS.has(section)) {
      return res.status(400).json({ error: 'section 必須是 today / tomorrow / notes' });
    }
    if (!ALLOWED_IMAGE_MIME.has(req.file.mimetype)) {
      return res.status(400).json({ error: '只接受 JPEG / PNG / WebP / GIF 圖片' });
    }

    const log = await dbCall(db, 'get', 'SELECT * FROM work_logs WHERE id = ?', [id]);
    if (!log) return res.status(404).json({ error: '日誌不存在' });

    if (log.user_id !== currentUser.id) {
      return res.status(403).json({ error: '只有日誌作者可上傳圖片' });
    }

    const images = parseImages(log.images);
    if (images[section].length >= MAX_IMAGES_PER_SECTION) {
      return res.status(400).json({ error: `每段最多 ${MAX_IMAGES_PER_SECTION} 張圖片` });
    }

    const hash = fileStorage.computeHash(req.file.buffer);
    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const blobPath = fileStorage.writeBlob(hash, ext, req.file.buffer);

    const decodedFilename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const newImage = {
      hash,
      filename: decodedFilename,
      size: req.file.size,
      mime_type: req.file.mimetype,
      uploader_id: currentUser.id,
      uploaded_at: new Date().toISOString(),
      blob_path: blobPath,
    };
    images[section].push(newImage);

    await dbCall(db, 'run', 'UPDATE work_logs SET images = ?, updated_at = ? WHERE id = ?', [
      JSON.stringify(images),
      new Date().toISOString(),
      id,
    ]);

    res.json({ image: newImage, section });
  } catch (err) {
    console.error('[work-logs] image upload error:', err.message);
    res.status(500).json({ error: '上傳圖片失敗' });
  }
});

// GET /api/work-logs/images/:hash/:filename - Serve image blob (auth required)
router.get('/images/:hash/:filename', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { hash } = req.params;

    const logs = await dbCall(db, 'all', 'SELECT * FROM work_logs WHERE images IS NOT NULL', []);
    let foundImage = null;
    let foundLog = null;
    for (const log of logs) {
      const imgs = parseImages(log.images);
      for (const section of ['today', 'tomorrow', 'notes']) {
        const match = imgs[section].find((i) => i.hash === hash);
        if (match) {
          foundImage = match;
          foundLog = log;
          break;
        }
      }
      if (foundImage) break;
    }
    if (!foundImage) return res.status(404).json({ error: '圖片不存在' });

    const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    const isAuthor = foundLog.user_id === currentUser.id;
    const isSameDept = foundLog.department_id === currentUser.department;
    if (!isAuthor && !isManager && !isSameDept) {
      return res.status(403).json({ error: '無權限查看此圖片' });
    }

    const buffer = fileStorage.readBlob(foundImage.blob_path);
    res.set('Content-Type', foundImage.mime_type);
    res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(foundImage.filename)}`);
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (err) {
    console.error('[work-logs] image fetch error:', err.message);
    res.status(500).json({ error: '取得圖片失敗' });
  }
});

// DELETE /api/work-logs/:id/images/:hash?section=today - Remove image
router.delete('/:id/images/:hash', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id, hash } = req.params;
    const section = req.query.section;

    if (!VALID_SECTIONS.has(section)) {
      return res.status(400).json({ error: 'section 必須是 today / tomorrow / notes' });
    }

    const log = await dbCall(db, 'get', 'SELECT * FROM work_logs WHERE id = ?', [id]);
    if (!log) return res.status(404).json({ error: '日誌不存在' });

    const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    const isAuthor = log.user_id === currentUser.id;
    if (!isAuthor && !isManager) {
      return res.status(403).json({ error: '無權限刪除此圖片' });
    }

    const images = parseImages(log.images);
    const before = images[section].length;
    images[section] = images[section].filter((i) => i.hash !== hash);
    if (images[section].length === before) {
      return res.status(404).json({ error: '該段落沒有此圖片' });
    }

    await dbCall(db, 'run', 'UPDATE work_logs SET images = ?, updated_at = ? WHERE id = ?', [
      JSON.stringify(images),
      new Date().toISOString(),
      id,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('[work-logs] image delete error:', err.message);
    res.status(500).json({ error: '刪除圖片失敗' });
  }
});

module.exports = router;

