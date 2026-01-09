const fs = require('fs');

console.log('=== 移除預設部門自動創建邏輯 ===\n');

const files = ['/app/dist/database.js', '/app/dist/database-v2.js'];

files.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ 文件不存在: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 修改 defaultDepts 陣列，只保留 Management 和 UNASSIGNED
    const oldDepts = `const defaultDepts = [
            { id: 'Management', name: '營運管理部', theme: 'slate', icon: '💼' },
            { id: 'Engineering', name: '技術工程部', theme: 'blue', icon: '🔧' },
            { id: 'Marketing', name: '市場行銷部', theme: 'purple', icon: '📢' },
            { id: 'HR', name: '人力資源部', theme: 'rose', icon: '👥' },
            { id: 'UNASSIGNED', name: '待分配 / 新人', theme: 'slate', icon: '🔰' }
        ];`;
    
    const newDepts = `const defaultDepts = [
            { id: 'Management', name: '營運管理部', theme: 'slate', icon: '💼' },
            { id: 'UNASSIGNED', name: '待分配 / 新人', theme: 'slate', icon: '🔰' }
        ];`;
    
    if (content.includes('Engineering')) {
        content = content.replace(oldDepts, newDepts);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ 已修復: ${filePath}`);
    } else {
        console.log(`ℹ️ 無需修改: ${filePath}`);
    }
});

console.log('\n修復完成！');
console.log('注意：已存在的部門需要手動從資料庫中刪除');
