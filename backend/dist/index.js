#!/usr/bin/env node
"use strict";
require('dotenv').config();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 命令列介面
commander_1.program
    .name('TaskFlowProServer')
    .description('TaskFlow Pro 企業管理系統 - 可攜式伺服器')
    .version('1.0.0');
commander_1.program
    .command('start')
    .description('啟動伺服器')
    .option('-p, --port <number>', '指定端口 (預設: 5000)', '5000')
    .option('-d, --data <path>', '指定資料目錄 (預設: ./data)', './data')
    .option('--no-https', '停用 HTTPS')
    .action(async (options) => {
    const server = new server_1.TaskFlowServer({
        port: parseInt(process.env.PORT || options.port),
        dataPath: path_1.default.resolve(options.data),
        httpsEnabled: options.https
    });
    await server.start();
});
commander_1.program
    .command('init')
    .description('初始化新環境')
    .option('-d, --data <path>', '指定資料目錄 (預設: ./data)', './data')
    .action(async (options) => {
    const dataPath = path_1.default.resolve(options.data);
    console.log('🚀 初始化 TaskFlow Pro 環境...');
    console.log(`📁 資料目錄: ${dataPath}`);
    // 創建必要目錄
    const dirs = [
        dataPath,
        path_1.default.join(dataPath, 'uploads'),
        path_1.default.join(dataPath, 'backups'),
        path_1.default.join(dataPath, 'certificates'),
        path_1.default.join(dataPath, 'logs')
    ];
    for (const dir of dirs) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
            console.log(`✅ 創建目錄: ${dir}`);
        }
    }
    // 創建配置檔案
    const configPath = path_1.default.join(dataPath, 'config.json');
    if (!fs_1.default.existsSync(configPath)) {
        const config = {
            initialized: true,
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            settings: {
                autoBackup: true,
                backupInterval: 'daily',
                maxBackups: 7,
                sessionTimeout: 3600
            }
        };
        fs_1.default.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`✅ 創建配置: ${configPath}`);
    }
    console.log('🎉 環境初始化完成！');
    console.log('💡 下一步: 執行 "TaskFlowProServer start" 啟動伺服器');
});
commander_1.program
    .command('backup')
    .description('備份資料庫')
    .option('-d, --data <path>', '指定資料目錄 (預設: ./data)', './data')
    .option('-o, --output <path>', '指定備份檔案路徑')
    .action(async (options) => {
    const dataPath = path_1.default.resolve(options.data);
    const dbPath = path_1.default.join(dataPath, 'taskflow.db');
    if (!fs_1.default.existsSync(dbPath)) {
        console.error('❌ 資料庫檔案不存在');
        process.exit(1);
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultBackupPath = path_1.default.join(dataPath, 'backups', `taskflow-backup-${timestamp}.db`);
    const backupPath = options.output ? path_1.default.resolve(options.output) : defaultBackupPath;
    try {
        fs_1.default.copyFileSync(dbPath, backupPath);
        console.log(`✅ 資料庫已備份至: ${backupPath}`);
        // 顯示備份資訊
        const stats = fs_1.default.statSync(backupPath);
        console.log(`📊 備份大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📅 備份時間: ${new Date().toLocaleString()}`);
    }
    catch (error) {
        console.error('❌ 備份失敗:', error);
        process.exit(1);
    }
});
commander_1.program
    .command('restore')
    .description('恢復資料庫')
    .option('-d, --data <path>', '指定資料目錄 (預設: ./data)', './data')
    .argument('<backup>', '備份檔案路徑')
    .action(async (backupFile, options) => {
    const dataPath = path_1.default.resolve(options.data);
    const dbPath = path_1.default.join(dataPath, 'taskflow.db');
    const backupPath = path_1.default.resolve(backupFile);
    if (!fs_1.default.existsSync(backupPath)) {
        console.error('❌ 備份檔案不存在');
        process.exit(1);
    }
    // 備份當前資料庫
    if (fs_1.default.existsSync(dbPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const currentBackup = path_1.default.join(dataPath, 'backups', `pre-restore-${timestamp}.db`);
        fs_1.default.copyFileSync(dbPath, currentBackup);
        console.log(`💾 當前資料庫已備份至: ${currentBackup}`);
    }
    try {
        fs_1.default.copyFileSync(backupPath, dbPath);
        console.log(`✅ 資料庫已從 ${backupPath} 恢復`);
        console.log('🔄 請重新啟動伺服器使變更生效');
    }
    catch (error) {
        console.error('❌ 恢復失敗:', error);
        process.exit(1);
    }
});
commander_1.program
    .command('migrate')
    .description('遷移到新主機')
    .argument('<source>', '來源資料目錄')
    .argument('<target>', '目標資料目錄')
    .action(async (source, target) => {
    const sourcePath = path_1.default.resolve(source);
    const targetPath = path_1.default.resolve(target);
    if (!fs_1.default.existsSync(sourcePath)) {
        console.error('❌ 來源目錄不存在');
        process.exit(1);
    }
    console.log('🔄 開始遷移 TaskFlow Pro...');
    console.log(`📤 來源: ${sourcePath}`);
    console.log(`📥 目標: ${targetPath}`);
    // 創建目標目錄
    if (!fs_1.default.existsSync(targetPath)) {
        fs_1.default.mkdirSync(targetPath, { recursive: true });
    }
    // 複製重要檔案
    const filesToCopy = [
        'taskflow.db',
        '.db-key',
        'config.json',
        'certificates/',
        'uploads/',
        'backups/'
    ];
    for (const file of filesToCopy) {
        const sourceFile = path_1.default.join(sourcePath, file);
        const targetFile = path_1.default.join(targetPath, file);
        if (fs_1.default.existsSync(sourceFile)) {
            if (fs_1.default.statSync(sourceFile).isDirectory()) {
                // 複製目錄
                copyDirectory(sourceFile, targetFile);
            }
            else {
                // 複製檔案
                fs_1.default.copyFileSync(sourceFile, targetFile);
            }
            console.log(`✅ 已複製: ${file}`);
        }
    }
    console.log('🎉 遷移完成！');
    console.log(`💡 下一步: cd ${targetPath} && TaskFlowProServer start`);
});
commander_1.program
    .command('status')
    .description('顯示系統狀態')
    .option('-d, --data <path>', '指定資料目錄 (預設: ./data)', './data')
    .action(async (options) => {
    const dataPath = path_1.default.resolve(options.data);
    const dbPath = path_1.default.join(dataPath, 'taskflow.db');
    console.log('📊 TaskFlow Pro 系統狀態');
    console.log('================================');
    // 檢查資料庫
    if (fs_1.default.existsSync(dbPath)) {
        const stats = fs_1.default.statSync(dbPath);
        console.log(`✅ 資料庫: 存在 (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`📅 修改時間: ${stats.mtime.toLocaleString()}`);
    }
    else {
        console.log('❌ 資料庫: 不存在');
    }
    // 檢查加密金鑰
    const keyPath = path_1.default.join(dataPath, '.db-key');
    if (fs_1.default.existsSync(keyPath)) {
        console.log('✅ 加密金鑰: 存在');
    }
    else {
        console.log('⚠️ 加密金鑰: 不存在 (資料可能未加密)');
    }
    // 檢查憑證
    const certDir = path_1.default.join(dataPath, 'certificates');
    const certFile = path_1.default.join(certDir, 'server.crt');
    if (fs_1.default.existsSync(certFile)) {
        console.log('✅ HTTPS 憑證: 存在');
    }
    else {
        console.log('⚠️ HTTPS 憑證: 不存在 (首次啟動時會自動生成)');
    }
    // 檢查目錄
    const dirs = ['uploads', 'backups', 'logs'];
    for (const dir of dirs) {
        const dirPath = path_1.default.join(dataPath, dir);
        if (fs_1.default.existsSync(dirPath)) {
            const files = fs_1.default.readdirSync(dirPath).length;
            console.log(`📁 ${dir}: ${files} 個檔案`);
        }
        else {
            console.log(`❌ ${dir}: 不存在`);
        }
    }
    console.log('================================');
});
// 複製目錄的輔助函數
function copyDirectory(src, dest) {
    if (!fs_1.default.existsSync(dest)) {
        fs_1.default.mkdirSync(dest, { recursive: true });
    }
    const entries = fs_1.default.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path_1.default.join(src, entry.name);
        const destPath = path_1.default.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        }
        else {
            fs_1.default.copyFileSync(srcPath, destPath);
        }
    }
}
// 錯誤處理
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕獲的異常:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未處理的 Promise 拒絕:', reason);
    process.exit(1);
});
// 解析命令列參數
commander_1.program.parse();
// 如果沒有提供命令，顯示幫助
if (!process.argv.slice(2).length) {
    commander_1.program.outputHelp();
}
//# sourceMappingURL=index.js.map