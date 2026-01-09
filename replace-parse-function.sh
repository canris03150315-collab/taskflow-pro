#!/bin/bash
cd /app/dist/routes

# 使用 awk 替換整個函數
awk '
/^function parseAnnouncementJson/ {
    print "function parseAnnouncementJson(ann) {"
    print "  if (!ann) return ann;"
    print "  let readByArray = [];"
    print "  try {"
    print "    readByArray = ann.read_by ? JSON.parse(ann.read_by) : [];"
    print "  } catch (e) {"
    print "    readByArray = [];"
    print "  }"
    print "  return {"
    print "    id: ann.id,"
    print "    title: ann.title,"
    print "    content: ann.content,"
    print "    priority: ann.priority,"
    print "    createdBy: ann.created_by,"
    print "    createdAt: ann.created_at,"
    print "    updatedAt: ann.updated_at,"
    print "    readBy: readByArray,"
    print "    read_by: readByArray"
    print "  };"
    print "}"
    # 跳過原函數的所有行直到遇到下一個函數或路由定義
    while (getline > 0) {
        if (/^router\./ || /^function / || /^const /) {
            print
            break
        }
    }
    next
}
{ print }
' announcements.js > announcements.js.new

mv announcements.js.new announcements.js
echo "✅ 替換完成"

# 驗證
echo "驗證新函數："
grep -A 5 "function parseAnnouncementJson" announcements.js | head -10
