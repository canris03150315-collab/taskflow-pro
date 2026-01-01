// 更新後的 finance 路由

router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const records = await db.all("SELECT * FROM finance_records ORDER BY date DESC, created_at DESC");
        res.json(records || []);
    } catch (error) {
        console.error("獲取財務記錄錯誤:", error);
        res.json([]);
    }
});

router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { type, amount, description, category, attachment, date, scope, departmentId, ownerId, recordedBy, status } = req.body;
        const id = "fin-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        
        // 確保資料表有所有需要的欄位
        try {
            await db.run("ALTER TABLE finance_records ADD COLUMN date TEXT");
        } catch (e) {}
        try {
            await db.run("ALTER TABLE finance_records ADD COLUMN scope TEXT DEFAULT 'DEPARTMENT'");
        } catch (e) {}
        try {
            await db.run("ALTER TABLE finance_records ADD COLUMN department_id TEXT");
        } catch (e) {}
        try {
            await db.run("ALTER TABLE finance_records ADD COLUMN owner_id TEXT");
        } catch (e) {}
        try {
            await db.run("ALTER TABLE finance_records ADD COLUMN recorded_by TEXT");
        } catch (e) {}
        try {
            await db.run("ALTER TABLE finance_records ADD COLUMN attachment TEXT");
        } catch (e) {}
        
        await db.run(
            `INSERT INTO finance_records (id, type, amount, description, category, attachment, user_id, status, created_at, date, scope, department_id, owner_id, recorded_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, type, amount, description || '', category || '', attachment || '', req.user.id, status || 'COMPLETED', new Date().toISOString(), date || new Date().toISOString().split('T')[0], scope || 'DEPARTMENT', departmentId || '', ownerId || '', recordedBy || req.user.id]
        );
        
        const newRecord = await db.get("SELECT * FROM finance_records WHERE id = ?", [id]);
        res.json(newRecord);
    } catch (error) {
        console.error("創建財務記錄錯誤:", error);
        res.status(500).json({ error: "創建失敗: " + error.message });
    }
});
