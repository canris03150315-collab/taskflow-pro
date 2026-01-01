#!/bin/bash
echo "=== 修復權限設定問題（含除錯） ==="

# 建立新的 users.js 更新部分，加入除錯
docker exec taskflow-pro sh -c 'cat > /tmp/fix-users-update.js << '"'"'FIXEOF'"'"'
// 修復更新用戶的部分 - 加入除錯日誌
router.put("/:id", async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { name, username, password, role, department, avatar, permissions } = req.body;

        console.log("[Users] 更新用戶請求:", { 
            targetId: id, 
            currentUserRole: currentUser.role,
            hasPermissions: permissions !== undefined,
            permissionsValue: permissions
        });

        const targetUser = await db.get("SELECT * FROM users WHERE id = ?", [id]);
        if (!targetUser) {
            return res.status(404).json({ error: "用戶不存在" });
        }

        const isSelf = currentUser.id === id;
        // 允許 BOSS, MANAGER, SUPERVISOR 修改其他用戶
        const isAdmin = currentUser.role === "BOSS" || currentUser.role === "MANAGER" || currentUser.role === "SUPERVISOR";

        console.log("[Users] 權限檢查:", { isSelf, isAdmin, currentRole: currentUser.role });

        // 自己編輯自己時，不允許修改角色、部門、權限
        if (isSelf && !isAdmin) {
            if (role !== undefined && role !== targetUser.role) {
                return res.status(403).json({ error: "無權修改自己的角色" });
            }
            if (department !== undefined && department !== targetUser.department) {
                return res.status(403).json({ error: "無權修改自己的部門" });
            }
            if (permissions !== undefined) {
                return res.status(403).json({ error: "無權修改自己的權限" });
            }
        }

        // 非管理員不能修改其他人
        if (!isSelf && !isAdmin) {
            return res.status(403).json({ error: "無權修改其他用戶" });
        }

        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push("name = ?"); params.push(name); }
        if (username !== undefined) { updates.push("username = ?"); params.push(username); }
        if (password !== undefined && password.trim()) {
            const bcrypt = require("bcrypt");
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push("password = ?");
            params.push(hashedPassword);
        }
        // 修改：允許 isAdmin 修改這些欄位
        if (role !== undefined && isAdmin) { updates.push("role = ?"); params.push(role); }
        if (department !== undefined && isAdmin) { updates.push("department = ?"); params.push(department); }
        if (avatar !== undefined) { updates.push("avatar = ?"); params.push(avatar); }
        
        // 關鍵修改：權限更新
        if (permissions !== undefined && isAdmin) { 
            console.log("[Users] 更新權限:", permissions);
            updates.push("permissions = ?"); 
            params.push(JSON.stringify(permissions)); 
        }

        updates.push("updated_at = ?");
        params.push(new Date().toISOString());
        params.push(id);

        const sql = "UPDATE users SET " + updates.join(", ") + " WHERE id = ?";
        console.log("[Users] SQL:", sql);
        console.log("[Users] Params:", params);

        await db.run(sql, params);

        const updatedUser = await db.get("SELECT id, name, role, department, avatar, username, created_at, updated_at, permissions FROM users WHERE id = ?", [id]);
        
        console.log("[Users] 更新後的權限:", updatedUser.permissions);
        
        res.json({
            ...updatedUser,
            permissions: updatedUser.permissions ? JSON.parse(updatedUser.permissions) : []
        });
    }
    catch (error) {
        console.error("更新用戶錯誤:", error);
        res.status(500).json({ error: "更新用戶失敗: " + error.message });
    }
});
FIXEOF'

# 取得完整的 users.js
docker exec taskflow-pro cat /app/dist/routes/users.js > /tmp/users-original.js

# 找到原始的 router.put 開始位置並替換
docker exec taskflow-pro sh -c '
# 取得原始檔案
cat /app/dist/routes/users.js > /tmp/users-orig.js

# 找到 router.put 的行號
PUT_LINE=$(grep -n "router.put.*:id" /tmp/users-orig.js | head -1 | cut -d: -f1)
echo "找到 router.put 在第 $PUT_LINE 行"

# 取得 PUT 之前的部分
head -n $((PUT_LINE - 1)) /tmp/users-orig.js > /tmp/users-new.js

# 加入新的 PUT 處理
cat /tmp/fix-users-update.js >> /tmp/users-new.js

# 找到下一個 router. 開始的位置（在 PUT 之後）
NEXT_ROUTE=$(tail -n +$((PUT_LINE + 1)) /tmp/users-orig.js | grep -n "^router\." | head -1 | cut -d: -f1)
if [ -n "$NEXT_ROUTE" ]; then
    echo "找到下一個路由在 PUT 之後 $NEXT_ROUTE 行"
    SKIP_TO=$((PUT_LINE + NEXT_ROUTE))
    tail -n +$SKIP_TO /tmp/users-orig.js >> /tmp/users-new.js
fi

# 覆蓋原始檔案
cp /tmp/users-new.js /app/dist/routes/users.js
'

echo "✓ users.js 已更新（含除錯日誌）"

# 重啟容器
docker restart taskflow-pro
sleep 3

echo "=== 完成 ==="
echo "請再次嘗試修改權限，然後告訴我結果"
