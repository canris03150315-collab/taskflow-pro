#!/bin/bash
# 全面比對 v8.9.139 vs v8.9.152

echo "=== 開始全面比對分析 ==="
echo ""
echo "基準: v8.9.139-ai-privacy-removed (AI 功能修復成功)"
echo "當前: v8.9.152-work-logs-correct-fields"
echo ""

cd /tmp/full-compare

# 1. 文件數量統計
echo "### 1. 文件數量統計"
echo "舊版本文件數: $(find old -type f | wc -l)"
echo "當前版本文件數: $(find current -type f | wc -l)"
echo ""

# 2. 新增的文件
echo "### 2. 新增的文件（當前有，舊版無）"
find current -type f | sed 's|^current/||' | sort > /tmp/current-files.txt
find old -type f | sed 's|^old/||' | sort > /tmp/old-files.txt
comm -13 /tmp/old-files.txt /tmp/current-files.txt > /tmp/new-files.txt
cat /tmp/new-files.txt
echo "新增文件數: $(wc -l < /tmp/new-files.txt)"
echo ""

# 3. 刪除的文件
echo "### 3. 刪除的文件（舊版有，當前無）"
comm -23 /tmp/old-files.txt /tmp/current-files.txt > /tmp/deleted-files.txt
cat /tmp/deleted-files.txt
echo "刪除文件數: $(wc -l < /tmp/deleted-files.txt)"
echo ""

# 4. 修改的文件
echo "### 4. 修改的文件"
comm -12 /tmp/old-files.txt /tmp/current-files.txt | while read file; do
  if ! diff -q "old/$file" "current/$file" > /dev/null 2>&1; then
    echo "$file"
  fi
done > /tmp/modified-files.txt
cat /tmp/modified-files.txt
echo "修改文件數: $(wc -l < /tmp/modified-files.txt)"
echo ""

# 5. 重點文件詳細比對
echo "### 5. 重點文件詳細比對"
echo ""

for file in routes/auth.js routes/users.js routes/tasks.js routes/reports.js routes/attendance.js middleware/auth.js server.js index.js; do
  if [ -f "old/$file" ] && [ -f "current/$file" ]; then
    if ! diff -q "old/$file" "current/$file" > /dev/null 2>&1; then
      echo "=== $file 有差異 ==="
      echo "舊版本行數: $(wc -l < old/$file)"
      echo "當前版本行數: $(wc -l < current/$file)"
      echo "差異摘要:"
      diff -u "old/$file" "current/$file" | head -30
      echo ""
    else
      echo "=== $file 無差異 ==="
      echo ""
    fi
  elif [ ! -f "old/$file" ] && [ -f "current/$file" ]; then
    echo "=== $file 是新增文件 ==="
    echo "行數: $(wc -l < current/$file)"
    echo ""
  elif [ -f "old/$file" ] && [ ! -f "current/$file" ]; then
    echo "=== $file 已被刪除 ==="
    echo ""
  fi
done

echo "=== 比對完成 ==="
