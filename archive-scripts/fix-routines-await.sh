#!/bin/bash
echo "=== 修復 routines.js (加入 await) ==="

docker exec taskflow-pro sh -c 'cat > /app/dist/routes/routines.js << '"'"'ROUTINESEOF'"'"'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routineRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");

const router = (0, express_1.Router)();

// GET /api/routines/templates
router.get("/templates", auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const stmt = db.prepare("SELECT * FROM routine_templates ORDER BY last_updated DESC");
    const templates = stmt.all() || [];
    const result = templates.map((t) => ({
      id: t.id,
      departmentId: t.department_id,
      title: t.title,
      items: JSON.parse(t.items || "[]"),
      lastUpdated: t.last_updated,
      readBy: JSON.parse(t.read_by || "[]"),
      isDaily: t.is_daily === 1
    }));
    res.json(result);
  } catch (error) {
    console.error("獲取模板錯誤:", error);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

// POST /api/routines/templates
router.post("/templates", auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const template = req.body;
    console.log("收到模板:", JSON.stringify(template));
    
    const existingStmt = db.prepare("SELECT id FROM routine_templates WHERE id = ?");
    const existing = existingStmt.get(template.id);
    console.log("existing 結果:", existing);
    
    if (existing) {
      const updateStmt = db.prepare("UPDATE routine_templates SET department_id = ?, title = ?, items = ?, last_updated = ?, is_daily = ? WHERE id = ?");
      const result = updateStmt.run(
        template.departmentId,
        template.title,
        JSON.stringify(template.items || []),
        template.lastUpdated || new Date().toISOString().split("T")[0],
        template.isDaily ? 1 : 0,
        template.id
      );
      console.log("UPDATE 完成, changes:", result.changes);
    } else {
      const insertStmt = db.prepare("INSERT INTO routine_templates (id, title, description, frequency, department_id, created_by, created_at, items, read_by, last_updated, is_daily) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const result = insertStmt.run(
        template.id,
        template.title,
        "",
        "daily",
        template.departmentId,
        currentUser.id,
        new Date().toISOString(),
        JSON.stringify(template.items || []),
        JSON.stringify([]),
        template.lastUpdated || new Date().toISOString().split("T")[0],
        template.isDaily ? 1 : 0
      );
      console.log("INSERT 完成, changes:", result.changes);
    }
    
    (0, logger_1.logSystemAction)(db, currentUser.id, "INFO", existing ? "更新文件模板: " + template.title : "新增文件模板: " + template.title);
    res.json(template);
  } catch (error) {
    console.error("儲存模板錯誤:", error);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

// DELETE /api/routines/templates/:id
router.delete("/templates/:id", auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM routine_templates WHERE id = ?");
    stmt.run(id);
    (0, logger_1.logSystemAction)(db, currentUser.id, "WARNING", "刪除文件模板 ID: " + id);
    res.json({ success: true });
  } catch (error) {
    console.error("刪除模板錯誤:", error);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

// POST /api/routines/templates/:id/read
router.post("/templates/:id/read", auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { userId } = req.body;
    const stmt = db.prepare("SELECT read_by FROM routine_templates WHERE id = ?");
    const template = stmt.get(id);
    if (!template) {
      return res.status(404).json({ error: "模板不存在" });
    }
    const readBy = JSON.parse(template.read_by || "[]");
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      const updateStmt = db.prepare("UPDATE routine_templates SET read_by = ? WHERE id = ?");
      updateStmt.run(JSON.stringify(readBy), id);
    }
    res.json({ success: true });
  } catch (error) {
    console.error("標記已讀錯誤:", error);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

// GET /api/routines/today
router.get("/today", auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { userId, deptId } = req.query;
    const today = new Date().toISOString().split("T")[0];
    
    db.exec("CREATE TABLE IF NOT EXISTS routine_records (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, user_id TEXT NOT NULL, date TEXT NOT NULL, items TEXT DEFAULT '[]', completed_at TEXT)");
    
    const dailyStmt = db.prepare("SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1 LIMIT 1");
    const dailyTemplate = dailyStmt.get(deptId);
    if (!dailyTemplate) {
      return res.json(null);
    }
    
    const recordStmt = db.prepare("SELECT * FROM routine_records WHERE template_id = ? AND user_id = ? AND date = ?");
    let record = recordStmt.get(dailyTemplate.id, userId, today);
    
    if (!record) {
      const templateItems = JSON.parse(dailyTemplate.items || "[]");
      const recordItems = templateItems.map((text) => ({ text, completed: false }));
      const recordId = "record-" + Date.now();
      const insertStmt = db.prepare("INSERT INTO routine_records (id, template_id, user_id, date, items) VALUES (?, ?, ?, ?, ?)");
      insertStmt.run(recordId, dailyTemplate.id, userId, today, JSON.stringify(recordItems));
      record = { id: recordId, template_id: dailyTemplate.id, user_id: userId, date: today, items: JSON.stringify(recordItems) };
    }
    
    res.json({
      id: record.id,
      templateId: record.template_id,
      userId: record.user_id,
      date: record.date,
      items: JSON.parse(record.items || "[]"),
      completedAt: record.completed_at
    });
  } catch (error) {
    console.error("獲取今日任務錯誤:", error);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

// POST /api/routines/records/:id/toggle
router.post("/records/:id/toggle", auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { index, isCompleted } = req.body;
    
    const stmt = db.prepare("SELECT * FROM routine_records WHERE id = ?");
    const record = stmt.get(id);
    if (!record) {
      return res.status(404).json({ error: "記錄不存在" });
    }
    
    const items = JSON.parse(record.items || "[]");
    if (index >= 0 && index < items.length) {
      items[index].completed = isCompleted;
    }
    const allCompleted = items.every((item) => item.completed);
    const completedAt = allCompleted ? new Date().toISOString() : null;
    
    const updateStmt = db.prepare("UPDATE routine_records SET items = ?, completed_at = ? WHERE id = ?");
    updateStmt.run(JSON.stringify(items), completedAt, id);
    res.json({ success: true });
  } catch (error) {
    console.error("切換任務狀態錯誤:", error);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

// GET /api/routines/history
router.get("/history", auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    db.exec("CREATE TABLE IF NOT EXISTS routine_records (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, user_id TEXT NOT NULL, date TEXT NOT NULL, items TEXT DEFAULT '[]', completed_at TEXT)");
    const stmt = db.prepare("SELECT * FROM routine_records ORDER BY date DESC LIMIT 100");
    const records = stmt.all() || [];
    const result = records.map((r) => ({
      id: r.id,
      templateId: r.template_id,
      userId: r.user_id,
      date: r.date,
      items: JSON.parse(r.items || "[]"),
      completedAt: r.completed_at
    }));
    res.json(result);
  } catch (error) {
    console.error("獲取歷史記錄錯誤:", error);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

exports.routineRoutes = router;
ROUTINESEOF'

echo "✓ routines.js 已更新"

docker restart taskflow-pro
sleep 3
echo "=== 完成 ==="
