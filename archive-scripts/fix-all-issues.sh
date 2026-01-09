#!/bin/bash
# 一次性修復所有後端問題
# 創建日期: 2026-01-02

echo "=========================================="
echo "開始修復所有後端問題..."
echo "=========================================="

# 1. 修復 auth.js (登入問題)
echo "1. 修復 auth.js..."
sed -i 's/req\.app\.getDatabase()/req.db/g' /app/dist/routes/auth.js
echo "   ✓ auth.js 已修復"

# 2. 修復 auth middleware (認證中間件)
echo "2. 修復 auth middleware..."
sed -i 's/req\.app\.getDatabase()/req.db/g' /app/dist/middleware/auth.js
echo "   ✓ auth middleware 已修復"

# 3. 檢查並修復 chat.js (如果存在)
echo "3. 檢查 chat.js..."
if [ -f "/app/dist/routes/chat.js" ]; then
    # 檢查文件大小
    FILE_SIZE=$(wc -l < /app/dist/routes/chat.js)
    if [ "$FILE_SIZE" -lt 100 ]; then
        echo "   ⚠ chat.js 文件太小 ($FILE_SIZE 行)，可能已損壞"
        echo "   需要從源文件恢復"
    else
        sed -i 's/req\.app\.getDatabase()/req.db/g' /app/dist/routes/chat.js
        echo "   ✓ chat.js 已修復"
    fi
else
    echo "   ⚠ chat.js 不存在"
fi

# 4. 檢查並修復 attendance.js
echo "4. 檢查 attendance.js..."
if [ -f "/app/dist/routes/attendance.js" ]; then
    # 檢查是否是 V37 版本
    if grep -q "Attendance V37" /app/dist/routes/attendance.js; then
        echo "   ✓ attendance.js 是 V37 版本"
    else
        echo "   ⚠ attendance.js 不是 V37 版本"
    fi
else
    echo "   ⚠ attendance.js 不存在"
fi

echo ""
echo "=========================================="
echo "修復完成！統計資訊："
echo "=========================================="

# 統計修復結果
echo "檢查錯誤的資料庫訪問..."
ERROR_COUNT=$(grep -r "req\.app\.getDatabase" /app/dist/ 2>/dev/null | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "✓ 沒有發現錯誤的資料庫訪問"
else
    echo "⚠ 仍有 $ERROR_COUNT 處錯誤的資料庫訪問"
    grep -rn "req\.app\.getDatabase" /app/dist/ 2>/dev/null
fi

echo ""
echo "檢查關鍵文件..."
echo "- auth.js: $(wc -l < /app/dist/routes/auth.js) 行"
echo "- auth middleware: $(wc -l < /app/dist/middleware/auth.js) 行"
if [ -f "/app/dist/routes/chat.js" ]; then
    echo "- chat.js: $(wc -l < /app/dist/routes/chat.js) 行"
fi
if [ -f "/app/dist/routes/attendance.js" ]; then
    echo "- attendance.js: $(wc -l < /app/dist/routes/attendance.js) 行"
fi

echo ""
echo "=========================================="
echo "修復腳本執行完成"
echo "請重啟容器以應用修復"
echo "=========================================="
