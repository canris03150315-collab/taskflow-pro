#!/bin/bash
# 修復 routines API v2 - 修正 db.all 和 is_daily 欄位問題

echo "=== 開始修復 routines API v2 ==="

# 1. 添加 is_daily 欄位到現有表
echo "添加 is_daily 欄位..."
docker exec taskflow-pro sh -c 'cat > /tmp/fix-table.js << '"'"'EOF'"'"'
const Database = require("better-sqlite3");
const db = new Database("/app/data/taskflow.db");

try {
  // 檢查表是否存在
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type=\"table\" AND name=\"routine_templates\"").get();
  
  if (tableExists) {
    // 檢查 is_daily 欄位是否存在
    const columns = db.prepare("PRAGMA table_info(routine_templates)").all();
    const hasIsDaily = columns.some(c => c.name === "is_daily");
    
    if (!hasIsDaily) {
      db.exec("ALTER TABLE routine_templates ADD COLUMN is_daily INTEGER DEFAULT 0");
      console.log("✓ 已添加 is_daily 欄位");
    } else {
      console.log("✓ is_daily 欄位已存在");
    }
  } else {
    // 創建表
    db.exec("CREATE TABLE routine_templates (id TEXT PRIMARY KEY, department_id TEXT NOT NULL, title TEXT NOT NULL, items TEXT DEFAULT \"[]\", last_updated TEXT, read_by TEXT DEFAULT \"[]\", is_daily INTEGER DEFAULT 0)");
    console.log("✓ 已創建 routine_templates 表");
  }
  
  // 創建 routine_records 表
  db.exec("CREATE TABLE IF NOT EXISTS routine_records (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, user_id TEXT NOT NULL, date TEXT NOT NULL, items TEXT DEFAULT \"[]\", completed_at TEXT)");
  console.log("✓ routine_records 表已就緒");
  
} catch (e) {
  console.error("錯誤:", e.message);
}

db.close();
EOF'
docker exec taskflow-pro node /tmp/fix-table.js

# 2. 更新 routines.js - 修正 db.all 返回值處理
echo "更新 routines.js..."
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
    try {
      const templates = db.all("SELECT * FROM routine_templates ORDER BY last_updated DESC") || [];
      const templatesArray = Array.isArray(templates) ? templates : [];
      const result = templatesArray.map((t) => ({
        id: t.id,
        departmentId: t.department_id,
        title: t.title,
        items: JSON.parse(t.items || "[]"),
        lastUpdated: t.last_updated,
        readBy: JSON.parse(t.read_by || "[]"),
        isDaily: t.is_daily === 1
      }));
      res.json(result);
    } catch (dbError) {
      console.error("DB錯誤:", dbError);
      if (dbError.message && dbError.message.includes("no such table")) {
        res.json([]);
      } else {
        throw dbError;
      }
    }
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
    const existing = db.get("SELECT id FROM routine_templates WHERE id = ?", [template.id]);
    if (existing) {
      db.run("UPDATE routine_templates SET department_id = ?, title = ?, items = ?, last_updated = ?, is_daily = ? WHERE id = ?", [
        template.departmentId,
        template.title,
        JSON.stringify(template.items || []),
        template.lastUpdated || new Date().toISOString().split("T")[0],
        template.isDaily ? 1 : 0,
        template.id
      ]);
    } else {
      db.run("INSERT INTO routine_templates (id, department_id, title, items, last_updated, read_by, is_daily) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        template.id,
        template.departmentId,
        template.title,
        JSON.stringify(template.items || []),
        template.lastUpdated || new Date().toISOString().split("T")[0],
        JSON.stringify([]),
        template.isDaily ? 1 : 0
      ]);
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
    db.run("DELETE FROM routine_templates WHERE id = ?", [id]);
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
    const template = db.get("SELECT read_by FROM routine_templates WHERE id = ?", [id]);
    if (!template) {
      return res.status(404).json({ error: "模板不存在" });
    }
    const readBy = JSON.parse(template.read_by || "[]");
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      db.run("UPDATE routine_templates SET read_by = ? WHERE id = ?", [JSON.stringify(readBy), id]);
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
    const dailyTemplate = db.get("SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1 LIMIT 1", [deptId]);
    if (!dailyTemplate) {
      return res.json(null);
    }
    let record = db.get("SELECT * FROM routine_records WHERE template_id = ? AND user_id = ? AND date = ?", [dailyTemplate.id, userId, today]);
    if (!record) {
      const templateItems = JSON.parse(dailyTemplate.items || "[]");
      const recordItems = templateItems.map((text) => ({ text, completed: false }));
      const recordId = "record-" + Date.now();
      db.run("INSERT INTO routine_records (id, template_id, user_id, date, items) VALUES (?, ?, ?, ?, ?)", [recordId, dailyTemplate.id, viserId, today, JSON.stringify(recordItems)]);
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
    const record = db.get("SELECT * FROM routine_records WHERE id = ?", [id]);
    if (!record) {
      return res.status(404).json({ error: "記錄不存在" });
    }
    const items = JSON.parse(record.items || "[]");
    if (index >= 0 && index < items.length) {
      items[index].completed = isCompleted;
    }
    const allCompleted = items.every((item) => item.completed);
    const completedAt = allCompleted ? new Date().toISOString() : null;
    db.run("UPDATE routine_records SET items = ?, completed_at = ? WHERE id = ?", [JSON.stringify(items), completedAt, id]);
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
    const records = db.all("SELECT * FROM routine_records ORDER BY date DESC LIMIT 100") || [];
    const recordsArray = Array.isArray(records) ? records : [];
    const result = recordsArray.map((r) => ({
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

# 3. 重啟容器
echo "重啟容器..."
docker restart taskflow-pro

sleep 3

# 4. 驗證
echo "=== 驗證 ==="
docker exec taskflow-pro sh -c 'cat > /tmp/test.js << '"'"'EOF'"'"'
const Database = require("better-sqlite3");
const db = new Database("/app/data/taskflow.db");
const cols = db.prepare("PRAGMA table_info(routine_templates)").all();
console.log("routine_templates 欄位:", cols.map(c => c.name).join(", "));
db.close();
EOF'
docker exec taskflow-pro node /tmp/test.js

echo ""
echo "=== 修復完成 ==="
