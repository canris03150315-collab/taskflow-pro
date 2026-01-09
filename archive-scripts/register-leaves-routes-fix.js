const fs = require('fs');

console.log('註冊 leaves 和 schedules 路由到 index.js...\n');

let content = fs.readFileSync('/app/dist/index.js', 'utf8');

// 檢查是否已經註冊
if (content.includes('leavesRoutes') || content.includes('schedulesRoutes')) {
    console.log('路由已經註冊！');
    process.exit(0);
}

// 找到其他路由的導入位置並添加 leaves/schedules 導入
const importPattern = /(const { \w+Routes } = require\('\.\/routes\/\w+'\);)/;
const lastImport = content.match(new RegExp(importPattern.source, 'g'));
if (lastImport && lastImport.length > 0) {
    const insertAfter = lastImport[lastImport.length - 1];
    content = content.replace(
        insertAfter,
        `${insertAfter}
const { leavesRoutes } = require('./routes/leaves');
const { schedulesRoutes } = require('./routes/schedules');`
    );
    console.log('✓ 添加了 leaves 和 schedules 路由的導入');
}

// 找到路由註冊的位置並添加 leaves/schedules 路由
const routePattern = /(app\.use\('\/api\/\w+', \w+Routes\);)/;
const lastRoute = content.match(new RegExp(routePattern.source, 'g'));
if (lastRoute && lastRoute.length > 0) {
    const insertAfter = lastRoute[lastRoute.length - 1];
    content = content.replace(
        insertAfter,
        `${insertAfter}
app.use('/api/leaves', leavesRoutes);
app.use('/api/schedules', schedulesRoutes);`
    );
    console.log('✓ 註冊了 /api/leaves 和 /api/schedules 路由');
}

fs.writeFileSync('/app/dist/index.js', content, 'utf8');

console.log('\n✅ 成功：假表路由已註冊！');
