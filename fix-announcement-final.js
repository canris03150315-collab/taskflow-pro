const fs = require('fs');
const path = '/app/dist/routes/announcements.js';

console.log('開始修復公告路由...\n');

let content = fs.readFileSync(path, 'utf8');

// 替換 parseAnnouncementJson 函數
const oldFunction = `function parseAnnouncementJson(ann) {
  if (!ann) return ann;
  
  try {
    ann.read_by = ann.read_by ? JSON.parse(ann.read_by) : [];
  } catch (e) {
    ann.read_by = [];
  }

  ann.createdBy = ann.created_by;
  ann.createdAt = ann.created_at;
  ann.updatedAt = ann.updated_at;
  ann.readBy = ann.read_by;

  return ann;
}`;

const newFunction = `function parseAnnouncementJson(ann) {
  if (!ann) return ann;
  
  let readByArray = [];
  try {
    readByArray = ann.read_by ? JSON.parse(ann.read_by) : [];
  } catch (e) {
    readByArray = [];
  }

  return {
    id: ann.id,
    title: ann.title,
    content: ann.content,
    priority: ann.priority,
    createdBy: ann.created_by,
    createdAt: ann.created_at,
    updatedAt: ann.updated_at,
    readBy: readByArray,
    read_by: readByArray
  };
}`;

content = content.replace(oldFunction, newFunction);

fs.writeFileSync(path, content, 'utf8');

console.log('✅ 修復完成！\n');

// 驗證
const newContent = fs.readFileSync(path, 'utf8');
if (newContent.includes('let readByArray = [];')) {
    console.log('✅ 驗證成功：新函數已生效');
} else {
    console.log('❌ 驗證失敗：請檢查文件');
}
