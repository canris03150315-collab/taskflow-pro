const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 建構 TaskFlow Pro 可攜式伺服器...');

// 確保必要目錄存在
const dirs = ['dist', 'data', 'public'];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 編譯 TypeScript
console.log('📝 編譯 TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('✅ TypeScript 編譯完成');
} catch (error) {
  console.error('❌ TypeScript 編譯失敗');
  process.exit(1);
}

// 複製前端檔案
console.log('📦 複製前端檔案...');
const frontendDist = path.join(__dirname, '../frontend/dist');
const publicDir = path.join(__dirname, 'public');

if (fs.existsSync(frontendDist)) {
  // 清空 public 目錄
  if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true });
  }
  fs.mkdirSync(publicDir);
  
  // 複製前端檔案
  copyDirectory(frontendDist, publicDir);
  console.log('✅ 前端檔案複製完成');
} else {
  console.warn('⚠️ 前端檔案不存在，請先建構前端');
}

// 複製 package.json
console.log('📋 複製 package.json...');
const packageJson = require('./package-server.json');
const distPackageJson = {
  ...packageJson,
  main: 'server.js',
  scripts: {
    start: 'node server.js',
    status: 'node server.js status',
    backup: 'node server.js backup'
  }
};
fs.writeFileSync(
  path.join(__dirname, 'dist/package.json'),
  JSON.stringify(distPackageJson, null, 2)
);

// 複製其他必要檔案
const filesToCopy = [
  '../README.md',
  '../.env.example'
];

for (const file of filesToCopy) {
  const source = path.join(__dirname, file);
  const dest = path.join(__dirname, 'dist', path.basename(file));
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`✅ 複製檔案: ${path.basename(file)}`);
  }
}

// 創建啟動腳本
console.log('📜 創建啟動腳本...');

// Windows 批次檔
const windowsScript = `@echo off
echo 🚀 啟動 TaskFlow Pro 伺服器...
echo.

REM 檢查 Node.js 是否安裝
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 請先安裝 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 檢查是否為首次執行
if not exist "data\\taskflow.db" (
    echo 🔧 首次執行，初始化環境...
    node server.js init
    echo.
)

echo 🌐 啟動伺服器...
node server.js start

pause
`;

fs.writeFileSync(path.join(__dirname, 'dist/start.bat'), windowsScript);

// Linux/Mac Shell 腳本
const unixScript = `#!/bin/bash

echo "🚀 啟動 TaskFlow Pro 伺服器..."
echo

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ 請先安裝 Node.js: https://nodejs.org/"
    exit 1
fi

# 檢查是否為首次執行
if [ ! -f "data/taskflow.db" ]; then
    echo "🔧 首次執行，初始化環境..."
    node server.js init
    echo
fi

echo "🌐 啟動伺服器..."
node server.js start
`;

fs.writeFileSync(path.join(__dirname, 'dist/start.sh'), unixScript);
fs.chmodSync(path.join(__dirname, 'dist/start.sh'), 0o755);

// 創建遷移腳本
const migrationScript = `#!/bin/bash

echo "🔄 TaskFlow Pro 伺服器遷移工具"
echo "================================"
echo

if [ $# -ne 2 ]; then
    echo "使用方法: $0 <來源目錄> <目標目錄>"
    echo "範例: $0 /old/server/taskflow /new/server/taskflow"
    exit 1
fi

SOURCE="$1"
TARGET="$2"

echo "📤 來源: $SOURCE"
echo "📥 目標: $TARGET"
echo

# 檢查來源目錄
if [ ! -d "$SOURCE" ]; then
    echo "❌ 來源目錄不存在: $SOURCE"
    exit 1
fi

# 檢查來源資料庫
if [ ! -f "$SOURCE/data/taskflow.db" ]; then
    echo "❌ 來源資料庫不存在: $SOURCE/data/taskflow.db"
    exit 1
fi

# 創建目標目錄
mkdir -p "$TARGET"

# 複製關鍵檔案
echo "📋 複製資料檔案..."
cp -r "$SOURCE/data" "$TARGET/"
echo "✅ 資料目錄複製完成"

echo "📦 複製程式檔案..."
cp -r "$SOURCE/dist" "$TARGET/"
echo "✅ 程式檔案複製完成"

echo "📜 複製啟動腳本..."
cp "$SOURCE/dist/start.sh" "$TARGET/"
cp "$SOURCE/dist/start.bat" "$TARGET/"
echo "✅ 啟動腳本複製完成"

echo
echo "🎉 遷移完成！"
echo
echo "💡 下一步操作:"
echo "1. cd $TARGET"
echo "2. ./start.sh (Linux/Mac) 或 start.bat (Windows)"
echo "3. 在瀏覽器訪問: https://localhost:5000"
echo
echo "📱 員工訪問說明:"
echo "- 手機瀏覽器輸入伺服器 IP: https://[您的IP]:5000"
echo "- 信任 HTTPS 憑證並安裝 PWA"
echo
`;

fs.writeFileSync(path.join(__dirname, 'dist/migrate.sh'), migrationScript);
fs.chmodSync(path.join(__dirname, 'dist/migrate.sh'), 0o755);

// 打包成執行檔
console.log('📦 打包執行檔...');
try {
  // Windows 版本
  execSync('npx pkg dist/server.js --targets node18-win-x64 --output ./dist/TaskFlowProServer.exe', { stdio: 'inherit' });
  console.log('✅ Windows 執行檔打包完成');
  
  // Linux 版本
  execSync('npx pkg dist/server.js --targets node18-linux-x64 --output ./dist/TaskFlowProServer-linux', { stdio: 'inherit' });
  console.log('✅ Linux 執行檔打包完成');
} catch (error) {
  console.warn('⚠️ 執行檔打包失敗，可手動執行: node server.js');
}

// 創建部署包
console.log('📦 創建部署包...');
const deployDir = path.join(__dirname, 'deploy');
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true });
}
fs.mkdirSync(deployDir);

// 複製必要檔案到部署目錄
const deployFiles = [
  'dist/server.js',
  'dist/package.json',
  'dist/start.bat',
  'dist/start.sh',
  'dist/migrate.sh',
  'public',
  'README.md',
  '.env.example'
];

for (const file of deployFiles) {
  const source = path.join(__dirname, file);
  const dest = path.join(deployDir, path.basename(file));
  
  if (fs.statSync(source).isDirectory()) {
    copyDirectory(source, dest);
  } else {
    fs.copyFileSync(source, dest);
  }
}

// 創建部署說明
const deployReadme = `# TaskFlow Pro 部署包

## 快速部署

### Windows
1. 解壓縮到目標目錄
2. 雙擊執行 \`start.bat\`
3. 按照提示操作

### Linux/Mac
1. 解壓縮到目標目錄
2. 執行 \`chmod +x start.sh\`
3. 執行 \`./start.sh\`

## 手動部署
1. 安裝 Node.js 18+ (https://nodejs.org/)
2. 執行 \`npm install\`
3. 執行 \`node server.js start\`

## 訪問地址
- 本地: https://localhost:5000
- 網路: https://[您的IP]:5000

## 遷移到新主機
使用 \`migrate.sh\` 腳本或手動複製 \`data\` 目錄

## 安全提醒
- 定期備份 \`data/taskflow.db\` 檔案
- 妥善保管 \`.db-key\` 加密金鑰
- HTTPS 憑證在 \`data/certificates/\` 目錄

## 技術支援
如遇問題請檢查:
1. Node.js 版本是否正確
2. 防火牆是否開放 5000 端口
3. 資料庫檔案權限是否正確
`;

fs.writeFileSync(path.join(deployDir, 'README.md'), deployReadme);

// 創建壓縮包
console.log('🗜️ 創建壓縮包...');
const archiver = require('archiver');
const output = fs.createWriteStream(path.join(__dirname, 'TaskFlowPro-Deploy.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✅ 部署包已創建: TaskFlowPro-Deploy.zip (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(deployDir, false);
archive.finalize();

console.log('');
console.log('🎉 建構完成！');
console.log('');
console.log('📦 產出檔案:');
console.log('  - TaskFlowProServer.exe (Windows 執行檔)');
console.log('  - TaskFlowProServer-linux (Linux 執行檔)');
console.log('  - TaskFlowPro-Deploy.zip (完整部署包)');
console.log('  - deploy/ (部署目錄)');
console.log('');
console.log('💡 部署方式:');
console.log('  1. 單一執行檔: 直接執行 TaskFlowProServer.exe');
console.log('  2. 部署包: 解壓縮 TaskFlowPro-Deploy.zip');
console.log('  3. 手動部署: 複製 deploy/ 目錄內容');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    entry.isDirectory() 
      ? copyDirectory(srcPath, destPath)
      : fs.copyFileSync(srcPath, destPath);
  }
}
