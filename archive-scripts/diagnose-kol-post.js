const fs = require('fs');

const filePath = '/app/dist/routes/kol.js';
const content = fs.readFileSync(filePath, 'utf8');

// 找到 POST /contracts 路由
const postRouteMatch = content.match(/router\.post\(['"]\/contracts['"],[\s\S]*?(?=router\.(get|post|put|delete)|$)/);

if (postRouteMatch) {
  const postRoute = postRouteMatch[0];
  
  // 提取 INSERT 語句
  const insertMatch = postRoute.match(/INSERT INTO kol_contracts[^;]+/);
  if (insertMatch) {
    console.log('=== INSERT Statement ===');
    console.log(insertMatch[0]);
  }
  
  // 提取參數列表
  const runMatch = postRoute.match(/\.run\([^)]+\)/);
  if (runMatch) {
    console.log('\n=== Parameters ===');
    console.log(runMatch[0]);
  }
  
  // 計算問號數量
  if (insertMatch) {
    const questionMarks = (insertMatch[0].match(/\?/g) || []).length;
    console.log('\n=== Analysis ===');
    console.log('Number of ? in INSERT:', questionMarks);
  }
} else {
  console.log('POST route not found');
}
