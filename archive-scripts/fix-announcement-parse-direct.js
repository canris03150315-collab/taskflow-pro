const fs = require('fs');

const filePath = '/app/dist/routes/announcements.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('直接替換 parseAnnouncementJson 函數...\n');

// 找到整個函數並替換
const pattern = /function parseAnnouncementJson\(ann\) \{[\s\S]*?\n\}/;

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

if (pattern.test(content)) {
    content = content.replace(pattern, newFunction);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ 成功替換 parseAnnouncementJson 函數');
    
    // 驗證替換結果
    const newContent = fs.readFileSync(filePath, 'utf8');
    if (newContent.includes('return {')) {
        console.log('✅ 驗證成功：新函數已生效');
    } else {
        console.log('❌ 驗證失敗：替換可能未成功');
    }
} else {
    console.log('❌ 未找到 parseAnnouncementJson 函數');
}

console.log('\n修復完成！');
