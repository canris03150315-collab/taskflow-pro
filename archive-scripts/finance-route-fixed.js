"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();

function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error(`Method ${method} not found on database object`);
}

router.get('/', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const records = dbCall(db, 'prepare', 'SELECT * FROM finance ORDER BY created_at DESC').all();
    res.json(records);
  } catch (error) {
    console.error('Get finance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.post('/', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { type, amount, description, category } = req.body;
    const id = `finance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 'INSERT INTO finance (id, type, amount, description, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, type, amount, description, category || 'OTHER', now, now
    );
    
    const record = dbCall(db, 'prepare', 'SELECT * FROM finance WHERE id = ?').get(id);
    res.json(record);
  } catch (error) {
    console.error('Create finance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.put('/:id', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { type, amount, description, category } = req.body;
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 'UPDATE finance SET type = ?, amount = ?, description = ?, category = ?, updated_at = ? WHERE id = ?').run(
      type, amount, description, category, now, id
    );
    
    const record = dbCall(db, 'prepare', 'SELECT * FROM finance WHERE id = ?').get(id);
    res.json(record);
  } catch (error) {
    console.error('Update finance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    dbCall(db, 'prepare', 'DELETE FROM finance WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete finance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

exports.financeRoutes = router;
