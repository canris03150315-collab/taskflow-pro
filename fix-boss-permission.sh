#!/bin/sh
# 修復 BOSS 無法修改自己的權限問題
# 找到 users.js 中的權限檢查邏輯並修改

docker exec taskflow-pro sh -c 'cat > /tmp/fix-permission.js << '"'"'EOF'"'"'
const fs = require("fs");
const path = "/app/dist/routes/users.js";
let content = fs.readFileSync(path, "utf8");

// 找到原始的權限檢查邏輯並替換
// 原始: if (isSelf) { if (role || department || permissions) { return res.status(403)...
// 修改: 如果是 BOSS，允許修改自己

const oldPattern = /if \(isSelf\) \{\s*if \(role \|\| department \|\| permissions\) \{\s*return res\.status\(403\)\.json\(\{ error: .無權修改自己的角色、部門或權限. \}\);/;

const newCode = `if (isSelf) {
        // BOSS 可以修改自己的所有資訊
        if (currentUser.role !== "BOSS" && (role || department || permissions)) {
            return res.status(403).json({ error: "無權修改自己的角色、部門或權限" });`;

if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newCode);
    fs.writeFileSync(path, content, "utf8");
    console.log("SUCCESS: Permission check updated for BOSS");
} else {
    console.log("Pattern not found, trying alternative approach...");
    // 嘗試更寬鬆的搜索
    if (content.includes("無權修改自己的角色、部門或權限")) {
        // 直接行替換
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("if (isSelf)") && i + 1 < lines.length && lines[i+1].includes("if (role || department || permissions)")) {
                lines[i] = "    if (isSelf) {";
                lines[i+1] = "        // BOSS 可以修改自己的所有資訊";
                lines.splice(i+2, 0, "        if (currentUser.role !== \"BOSS\" && (role || department || permissions)) {");
                break;
            }
        }
        content = lines.join("\n");
        fs.writeFileSync(path, content, "utf8");
        console.log("SUCCESS: Permission check updated (alternative method)");
    } else {
        console.log("ERROR: Could not find permission check code");
    }
}
EOF'

docker exec taskflow-pro node /tmp/fix-permission.js

# 驗證修改
echo "=== 驗證修改 ==="
docker exec taskflow-pro grep -A5 "if (isSelf)" /app/dist/routes/users.js | head -15

# 重啟容器
docker restart taskflow-pro
echo "=== 容器已重啟 ==="
