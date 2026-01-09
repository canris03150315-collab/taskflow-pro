const fs = require('fs');

const filePath = '/app/dist/routes/announcements.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('修復公告 readBy 數據映射...\n');

// 找到 parseAnnouncementJson 函數並修復
const oldParseFunction = `function parseAnnouncementJson(ann) {
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

const newParseFunction = `function parseAnnouncementJson(ann) {
  if (!ann) return ann;
  
  let readByArray = [];
  try {
    readByArray = ann.read_by ? JSON.parse(ann.read_by) : [];
  } catch (e) {
    readByArray = [];
  }

  // 返回新對象，確保數據格式正確
  return {
    id: ann.id,
    title: ann.title,
    content: ann.content,
    priority: ann.priority,
    createdBy: ann.created_by,
    createdAt: ann.created_at,
    updatedAt: ann.updated_at,
    readBy: readByArray,
    read_by: readByArray  // 保持兼容性
  };
}`;

if (content.includes('ann.readBy = ann.read_by;')) {
    content = content.replace(oldParseFunction, newParseFunction);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ 成功修復 parseAnnouncementJson 函數');
} else {
    console.log('⚠️ 未找到需要修復的代碼，可能已經修復過了');
}

console.log('\n修復完成！');
