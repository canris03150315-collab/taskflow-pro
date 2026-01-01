#!/usr/bin/env node

import { TaskFlowServer } from './server';
import { program } from 'commander';
import path from 'path';
import fs from 'fs';

// 命令列介面
program
  .name('TaskFlowProServer')
  .description('TaskFlow Pro 企業管理系統 - 可攜式伺服器')
  .version('1.0.0');

program
  .command('start')
  .description('啟動伺服器')
  .option('-p, --port <number>', '指定端口 (預設: 3000)', '3000')
  .option('-d, --data <path>', '指定資料目錄 (預設: ./data)', './data')
  .option('--no-https', '停用 HTTPS')
  .action(async (options) => {
    const server = new TaskFlowServer({
      port: parseInt(process.env.PORT || options.port),
      dataPath: path.resolve(options.data),
      httpsEnabled: options.https
    });

    await server.start();
  });

program
  .command('init')
  .description('初始化新環境')
  .option('-d, --data <path>', '指定資料目錄 (預設: ./data)', './data')
  .action(async (options) => {
    const dataPath = path.resolve(options.data);
    
    console.log('🚀 初始化 TaskFlow Pro 環境...');
    console.log(`📁 資料目錄: ${dataPath}`);
    
    // 創建必要目錄
    const dirs = [
      dataPath,
      path.join(dataPath, 'uploads'),
      path.join(dataPath, 'backups'),
      path.join(dataPath, 'certificates'),
      path.join(dataPath, 'logs')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ 創建目錄: ${dir}`);
      }
    }

    // 創建配置檔案
    const configPath = path.join(dataPath, 'config.json');
    if (!fs.existsSync(configPath)) {
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
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`✅ 創建配置: ${configPath}`);
    }

    console.log('🎉 環境初始化完成！');
    console.log('💡 下一步: 執行 "TaskFlowProServer start" 啟動伺服器');
  });

program
  .command('backup')
  .description('備份資料庫')
  .option('-d, --data <path>', '指定資料目錄 (預設: ./data)', './data')
  .option('-o, --output <path>', '指定備份檔案路徑')
  .action(async (options) => {
    const dataPath = path.resolve(options.data);
    const dbPath = path.join(dataPath, 'taskflow.db');
    
    if (!fs.existsSync(dbPath)) {
      console.error('❌ 資料庫檔案不存在');
      process.exit(1);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultBackupPath = path.join(dataPath, 'backups', `taskflow-backup-${timestamp}.db`);
    const backupPath = options.output ? path.resolve(options.output) : defaultBackupPath;

    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ 資料庫已備份至: ${backupPath}`);
      
      // 顯示備份資訊
      const stats = fs.statSync(backupPath);
      console.log(`📊 備份大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📅 備份時間: ${new Date().toLocaleString()}`);
    } catch (error) {
      console.error('❌ 備份失敗:', error);
      process.exit(1);
    }
  });

program
  .command('restore')
  .description('恢復資料庫')
  .option('-d, --data <path>', '指定資料目錄 (預設: ./data)', './data')
  .argument('<backup>', '備份檔案路徑')
  .action(async (backupFile, options) => {
    const dataPath = path.resolve(options.data);
    const dbPath = path.join(dataPath, 'taskflow.db');
    const backupPath = path.resolve(backupFile);
    
    if (!fs.existsSync(backupPath)) {
      console.error('❌ 備份檔案不存在');
      process.exit(1);
    }

    // 備份當前資料庫
    if (fs.existsSync(dbPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const currentBackup = path.join(dataPath, 'backups', `pre-restore-${timestamp}.db`);
      fs.copyFileSync(dbPath, currentBackup);
      console.log(`💾 當前資料庫已備份至: ${currentBackup}`);
    }

    try {
      fs.copyFileSync(backupPath, dbPath);
      console.log(`✅ 資料庫已從 ${backupPath} 恢復`);
      console.log('🔄 請重新啟動伺服器使變更生效');
    } catch (error) {
      console.error('❌ 恢復失敗:', error);
      process.exit(1);
    }
  });

program
  .command('migrate')
  .description('遷移到新主機')
  .argument('<source>', '來源資料目錄')
  .argument('<target>', '目標資料目錄')
  .action(async (source, target) => {
    const sourcePath = path.resolve(source);
    const targetPath = path.resolve(target);
    
    if (!fs.existsSync(sourcePath)) {
      console.error('❌ 來源目錄不存在');
      process.exit(1);
    }

    console.log('🔄 開始遷移 TaskFlow Pro...');
    console.log(`📤 來源: ${sourcePath}`);
    console.log(`📥 目標: ${targetPath}`);

    // 創建目標目錄
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
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
      const sourceFile = path.join(sourcePath, file);
      const targetFile = path.join(targetPath, file);
      
      if (fs.existsSync(sourceFile)) {
        if (fs.statSync(sourceFile).isDirectory()) {
          // 複製目錄
          copyDirectory(sourceFile, targetFile);
        } else {
          // 複製檔案
          fs.copyFileSync(sourceFile, targetFile);
        }
        console.log(`✅ 已複製: ${file}`);
      }
    }

    console.log('🎉 遷移完成！');
    console.log(`💡 下一步: cd ${targetPath} && TaskFlowProServer start`);
  });

program
  .command('status')
  .description('顯示系統狀態')
  .option('-d, --data <path>', '指定資料目錄 (預設: ./data)', './data')
  .action(async (options) => {
    const dataPath = path.resolve(options.data);
    const dbPath = path.join(dataPath, 'taskflow.db');
    
    console.log('📊 TaskFlow Pro 系統狀態');
    console.log('================================');
    
    // 檢查資料庫
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`✅ 資料庫: 存在 (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`📅 修改時間: ${stats.mtime.toLocaleString()}`);
    } else {
      console.log('❌ 資料庫: 不存在');
    }

    // 檢查加密金鑰
    const keyPath = path.join(dataPath, '.db-key');
    if (fs.existsSync(keyPath)) {
      console.log('✅ 加密金鑰: 存在');
    } else {
      console.log('⚠️ 加密金鑰: 不存在 (資料可能未加密)');
    }

    // 檢查憑證
    const certDir = path.join(dataPath, 'certificates');
    const certFile = path.join(certDir, 'server.crt');
    if (fs.existsSync(certFile)) {
      console.log('✅ HTTPS 憑證: 存在');
    } else {
      console.log('⚠️ HTTPS 憑證: 不存在 (首次啟動時會自動生成)');
    }

    // 檢查目錄
    const dirs = ['uploads', 'backups', 'logs'];
    for (const dir of dirs) {
      const dirPath = path.join(dataPath, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath).length;
        console.log(`📁 ${dir}: ${files} 個檔案`);
      } else {
        console.log(`❌ ${dir}: 不存在`);
      }
    }

    console.log('================================');
  });

// 複製目錄的輔助函數
function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
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
program.parse();

// 如果沒有提供命令，顯示幫助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
