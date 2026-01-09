#!/usr/bin/env python3
import re

# 讀取文件
with open('/app/dist/routes/tasks.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 修復員工查詢邏輯：增加公開任務條件
# 公開任務 = assigned_to_user_id IS NULL AND assigned_to_department IS NULL
content = re.sub(
    r"(if \(currentUser\.role === types_1\.Role\.EMPLOYEE\) \{[\s\S]*?// 員工只能看到分配給自己或自己部門的任務\s*\n\s*)(query \+= ' AND \(t\.assigned_to_user_id = \? OR t\.assigned_to_department = \? OR t\.created_by = \?\)';)",
    r"\1query += ' AND ((t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL) OR t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';",
    content,
    count=1
)

# 同步修復 countQuery
content = re.sub(
    r"(if \(currentUser\.role === types_1\.Role\.EMPLOYEE\) \{[\s\S]*?countQuery[\s\S]*?)(countQuery \+= ' AND \(t\.assigned_to_user_id = \? OR t\.assigned_to_department = \? OR t\.created_by = \?\)';)",
    r"\1countQuery += ' AND ((t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL) OR t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';",
    content,
    count=1
)

# 寫回文件
with open('/app/dist/routes/tasks.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ 修復完成：員工現在可以看到公開任務")
