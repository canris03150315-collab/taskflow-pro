#!/usr/bin/env python3
import re

# 讀取文件
with open('/app/dist/routes/tasks.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 修復 1: 員工查詢邏輯
content = re.sub(
    r"(if \(currentUser\.role === types_1\.Role\.EMPLOYEE\) \{[\s\S]*?)(query \+= ' AND \(t\.assigned_to_user_id = \? OR t\.assigned_to_department = \?\)';[\s\S]*?params\.push\(currentUser\.id, currentUser\.department\);)",
    r"\1query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';\n            params.push(currentUser.id, currentUser.department, currentUser.id);",
    content,
    count=1
)

# 修復 2: 主管查詢邏輯
content = re.sub(
    r"(else if \(currentUser\.role === types_1\.Role\.SUPERVISOR\) \{[\s\S]*?)(query \+= ' AND \(t\.target_department = \? OR t\.created_by = \?\)';[\s\S]*?params\.push\(currentUser\.department, currentUser\.id\);)",
    r"\1query += ' AND (t.target_department = ? OR t.assigned_to_department = ? OR t.created_by = ?)';\n            params.push(currentUser.department, currentUser.department, currentUser.id);",
    content,
    count=1
)

# 修復 3: 接取任務邏輯
content = re.sub(
    r"\(task\.assigned_to_department === currentUser\.department && currentUser\.role === types_1\.Role\.SUPERVISOR\);",
    r"(task.assigned_to_department === currentUser.department);",
    content
)

# 修復 4: 員工計數查詢
content = re.sub(
    r"(if \(currentUser\.role === types_1\.Role\.EMPLOYEE\) \{[\s\S]*?countQuery[\s\S]*?)(countQuery \+= ' AND \(t\.assigned_to_user_id = \? OR t\.assigned_to_department = \?\)';[\s\S]*?countParams\.push\(currentUser\.id, currentUser\.department\);)",
    r"\1countQuery += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';\n            countParams.push(currentUser.id, currentUser.department, currentUser.id);",
    content,
    count=1
)

# 修復 5: 主管計數查詢
content = re.sub(
    r"(else if \(currentUser\.role === types_1\.Role\.SUPERVISOR\) \{[\s\S]*?countQuery[\s\S]*?)(countQuery \+= ' AND \(t\.target_department = \? OR t\.created_by = \?\)';[\s\S]*?countParams\.push\(currentUser\.department, currentUser\.id\);)",
    r"\1countQuery += ' AND (t.target_department = ? OR t.assigned_to_department = ? OR t.created_by = ?)';\n            countParams.push(currentUser.department, currentUser.department, currentUser.id);",
    content,
    count=1
)

# 寫回文件
with open('/app/dist/routes/tasks.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ 修復完成")
