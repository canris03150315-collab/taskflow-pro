const fs = require('fs');
const path = require('path');

const routesDir = '/app/dist/routes';
const files = fs.readdirSync(routesDir);

console.log('=== 所有路由文件 ===');
files.forEach(file => {
    if (file.endsWith('.js')) {
        const filePath = path.join(routesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const hasApproval = content.includes('approval') || content.includes('authorize');
        console.log(`${file}: ${hasApproval ? '✅ 包含 approval' : '❌'}`);
    }
});

// 檢查 server/index.js
console.log('\n=== 檢查 index.js 中的路由註冊 ===');
try {
    const indexPath = '/app/dist/index.js';
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // 尋找 /api/reports 路由註冊
    const lines = indexContent.split('\n');
    const reportRoutes = lines.filter(line => 
        line.includes('/api/reports') || 
        line.includes('reportRoutes') ||
        line.includes('/reports')
    );
    
    console.log('Reports 路由註冊:');
    reportRoutes.forEach(line => console.log(line.trim()));
} catch (error) {
    console.error('無法讀取 index.js:', error.message);
}
