#!/bin/bash
# 生成詳細的差異報告

cd /tmp/full-compare

echo "# 全面差異分析報告"
echo ""
echo "**基準版本**: v8.9.139-ai-privacy-removed (AI 功能修復成功)"
echo "**當前版本**: v8.9.152-work-logs-correct-fields"
echo "**比對時間**: $(date)"
echo ""

echo "## 📊 統計摘要"
echo ""
echo "| 類別 | 數量 |"
echo "|------|------|"
echo "| 新增文件 | $(wc -l < /tmp/new-files.txt) |"
echo "| 刪除文件 | $(wc -l < /tmp/deleted-files.txt) |"
echo "| 修改文件 | $(wc -l < /tmp/modified-files.txt) |"
echo ""

echo "## 🆕 新增文件清單"
echo ""
echo "\`\`\`"
cat /tmp/new-files.txt
echo "\`\`\`"
echo ""

echo "## ❌ 刪除文件清單"
echo ""
if [ -s /tmp/deleted-files.txt ]; then
  echo "\`\`\`"
  cat /tmp/deleted-files.txt
  echo "\`\`\`"
else
  echo "無刪除文件"
fi
echo ""

echo "## 🔄 修改文件詳細分析"
echo ""

# 按類別分組
echo "### Routes 文件"
echo ""
cat /tmp/modified-files.txt | grep '^routes/.*\.js$' | while read file; do
  old_lines=$(wc -l < "old/$file" 2>/dev/null || echo "0")
  new_lines=$(wc -l < "current/$file" 2>/dev/null || echo "0")
  diff_count=$(diff -u "old/$file" "current/$file" 2>/dev/null | grep -c '^[+-]' || echo "0")
  
  echo "#### $file"
  echo "- 舊版本: $old_lines 行"
  echo "- 當前版本: $new_lines 行"
  echo "- 差異行數: $diff_count"
  
  # 顯示關鍵差異
  if echo "$file" | grep -qv 'kol\|work-log'; then
    echo "- **重要**: 非 KOL 相關文件"
    echo ""
    echo "\`\`\`diff"
    diff -u "old/$file" "current/$file" 2>/dev/null | head -50
    echo "\`\`\`"
  fi
  echo ""
done

echo "### Middleware 文件"
echo ""
cat /tmp/modified-files.txt | grep '^middleware/' | while read file; do
  echo "#### $file"
  old_lines=$(wc -l < "old/$file" 2>/dev/null || echo "0")
  new_lines=$(wc -l < "current/$file" 2>/dev/null || echo "0")
  echo "- 舊版本: $old_lines 行"
  echo "- 當前版本: $new_lines 行"
  echo ""
  echo "\`\`\`diff"
  diff -u "old/$file" "current/$file" 2>/dev/null | head -30
  echo "\`\`\`"
  echo ""
done

echo "### 核心文件 (server.js, index.js)"
echo ""
for file in server.js index.js; do
  if grep -q "^$file$" /tmp/modified-files.txt; then
    echo "#### $file"
    old_lines=$(wc -l < "old/$file" 2>/dev/null || echo "0")
    new_lines=$(wc -l < "current/$file" 2>/dev/null || echo "0")
    echo "- 舊版本: $old_lines 行"
    echo "- 當前版本: $new_lines 行"
    echo ""
    echo "\`\`\`diff"
    diff -u "old/$file" "current/$file" 2>/dev/null | head -50
    echo "\`\`\`"
    echo ""
  fi
done

echo "## ✅ 結論"
echo ""
echo "待補充分析..."
