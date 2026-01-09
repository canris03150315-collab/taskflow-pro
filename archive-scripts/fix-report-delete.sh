#!/bin/bash
echo "=== 新增報表刪除功能 ==="

# 添加刪除報表的 API 端點
docker exec taskflow-pro sh -c 'cat >> /app/dist/routes/reports.js << '"'"'DELETEEOF'"'"'

// DELETE /:id - 刪除報表
router.delete("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;

        // 獲取報表
        const report = await db.get("SELECT * FROM reports WHERE id = ?", [id]);
        if (!report) {
            return res.status(404).json({ error: "報表不存在" });
        }

        // 權限檢查：只有報表建立者、主管或管理員可以刪除
        const isOwner = report.submitted_by === currentUser.id;
        const isAdmin = currentUser.role === "BOSS" || currentUser.role === "MANAGER" || currentUser.role === "SUPERVISOR";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: "無權刪除此報表" });
        }

        // 刪除相關的編輯日誌
        await db.run("DELETE FROM report_edit_logs WHERE report_id = ?", [id]);
        
        // 刪除報表
        await db.run("DELETE FROM reports WHERE id = ?", [id]);

        console.log("[Reports] 報表已刪除:", id, "by", currentUser.name);
        res.json({ ok: true, message: "報表已刪除" });
    } catch (error) {
        console.error("[Reports] 刪除錯誤:", error);
        res.status(500).json({ error: "刪除失敗: " + error.message });
    }
});
DELETEEOF'

echo "✓ 報表刪除 API 已添加"

# 重啟容器
docker restart taskflow-pro
sleep 3

echo "=== 完成 ==="
echo "後端已支援刪除報表"
