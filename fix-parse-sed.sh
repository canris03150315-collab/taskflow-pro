#!/bin/bash
cd /app/dist/routes

# 使用 sed 進行多行替換
sed -i '/^function parseAnnouncementJson/,/^}$/{
  /^function parseAnnouncementJson/!{
    /^}$/!d
  }
}' announcements.js

# 在 function parseAnnouncementJson 後插入新內容
sed -i '/^function parseAnnouncementJson(ann) {$/a\
  if (!ann) return ann;\
  let readByArray = [];\
  try {\
    readByArray = ann.read_by ? JSON.parse(ann.read_by) : [];\
  } catch (e) {\
    readByArray = [];\
  }\
  return {\
    id: ann.id,\
    title: ann.title,\
    content: ann.content,\
    priority: ann.priority,\
    createdBy: ann.created_by,\
    createdAt: ann.created_at,\
    updatedAt: ann.updated_at,\
    readBy: readByArray,\
    read_by: readByArray\
  };
' announcements.js

echo "修復完成"
grep -A 15 "function parseAnnouncementJson" announcements.js | head -20
