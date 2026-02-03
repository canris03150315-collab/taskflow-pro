const fs = require('fs');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

// 修復 POST 路由的參數列表，添加 weeklyNotes
// 找到參數列表並在 currentUser.id 後面添加 weeklyNotes
content = content.replace(
  /\.run\(\s*id,\s*kolId,\s*startDate\s*\|\|\s*null,\s*endDate\s*\|\|\s*null,\s*salaryAmount,\s*depositAmount\s*\|\|\s*0,\s*unpaidAmount\s*\|\|\s*salaryAmount,\s*clearedAmount\s*\|\|\s*0,\s*totalPaid\s*\|\|\s*0,\s*contractType\s*\|\|\s*'NORMAL',\s*notes\s*\|\|\s*null,\s*now,\s*now,\s*currentUser\.id\s*\)/,
  `.run(
      id, kolId, startDate || null, endDate || null, salaryAmount, depositAmount || 0,
      unpaidAmount || salaryAmount, clearedAmount || 0, totalPaid || 0, contractType || 'NORMAL',
      notes || null, now, now, currentUser.id, weeklyNotes || null
    )`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed POST /contracts parameters - added weeklyNotes');
