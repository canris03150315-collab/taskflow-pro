#!/bin/bash
# 詳細比對後端路由文件

echo "=== 後端路由文件差異分析報告 ==="
echo ""
echo "比對基準："
echo "  舊版本: v8.9.140 (KOL 修改前, 2026-01-20)"
echo "  當前版本: v8.9.152 (當前運行)"
echo ""

cd /tmp/snapshot-compare

# 列出所有差異文件
echo "### 1. 差異文件清單"
diff -qr old-files/ current-files/ | grep "differ" | awk '{print $2}' | sed 's|old-files/||' > /tmp/diff-files.txt
cat /tmp/diff-files.txt
echo ""

# 列出新增的文件（KOL 相關）
echo "### 2. 新增的文件（當前有，舊版無）"
diff -qr old-files/ current-files/ | grep "Only in current-files" | awk -F': ' '{print $2}'
echo ""

# 列出刪除的文件
echo "### 3. 刪除的文件（舊版有，當前無）"  
diff -qr old-files/ current-files/ | grep "Only in old-files" | awk -F': ' '{print $2}'
echo ""

# 非 KOL 的差異文件
echo "### 4. 非 KOL 的差異文件（需要檢查）"
while read file; do
  if [[ ! "$file" =~ "kol" ]] && [[ ! "$file" =~ "KOL" ]]; then
    echo "  - $file"
    
    # 顯示文件大小對比
    old_size=$(stat -f%z "old-files/$file" 2>/dev/null || echo "N/A")
    new_size=$(stat -f%z "current-files/$file" 2>/dev/null || echo "N/A")
    echo "    舊: $old_size bytes, 新: $new_size bytes"
  fi
done < /tmp/diff-files.txt
echo ""

echo "=== 報告結束 ==="
