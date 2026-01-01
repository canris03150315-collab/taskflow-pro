import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { Database } from './database';
import { SecureDatabase } from './database-v2';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { taskRoutes } from './routes/tasks';
import { departmentRoutes } from './routes/departments';
import { attendanceRoutes } from './routes/attendance';
import { syncRoutes } from './routes/sync';
import { reportRoutes } from './routes/reports';
import { financeRoutes } from './routes/finance';
import { forumRoutes } from './routes/forum';
import { memoRoutes } from './routes/memos';
import { routineRoutes } from './routes/routines';
import { performanceRoutes } from './routes/performance';
import { chatRoutes } from './routes/chat';
// announcementRoutes and systemRoutes are optional; these route files may not exist in this build.
// import { announcementRoutes } from './routes/announcements';
import { logSystemAction } from './utils/logger';

export class TaskFlowServer {
  private app: express.Application;
  private server: any;
  private db: SecureDatabase;
  private config: {
    port: number;
    httpsEnabled: boolean;
    dataPath: string;
    uploadsPath: string;
  };

  constructor(config: any = {}) {
    this.config = {
      port: config.port || 3000,
      httpsEnabled: config.httpsEnabled !== false,
      dataPath: config.dataPath || './data',
      uploadsPath: config.uploadsPath || './data/uploads'
    };

    this.app = express();
    this.db = new SecureDatabase(path.join(this.config.dataPath, 'taskflow.db'));
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // 安全性中間件
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    // CORS 配置（支援行動裝置）
    this.app.use(cors({
      origin: ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // 壓縮響應
    this.app.use(compression());

    // 請求限制（防止濫用）
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 分鐘
      max: 1000, // 每個 IP 最多 1000 次請求
      message: { error: '請求過於頻繁，請稍後再試' },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api', limiter);

    // 請求解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 靜態檔案服務（前端 PWA）
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    if (fs.existsSync(frontendPath)) {
      this.app.use(express.static(frontendPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true
      }));
    }

    // 上傳檔案服務
    if (!fs.existsSync(this.config.uploadsPath)) {
      fs.mkdirSync(this.config.uploadsPath, { recursive: true });
    }
    this.app.use('/uploads', express.static(this.config.uploadsPath));

    // 請求日誌
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      // 資料庫中介軟體
      (req as any).db = this.db;
      next();
    });
  }

  private initializeRoutes(): void {
    // API 路由
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/departments', departmentRoutes);
    this.app.use('/api/tasks', taskRoutes);
    this.app.use('/api/attendance', attendanceRoutes);
    this.app.use('/api/sync', syncRoutes);
    // announcements route (optional)
    // this.app.use('/api/announcements', announcementRoutes);
    this.app.use('/api/reports', reportRoutes);
    this.app.use('/api/finance', financeRoutes);
    this.app.use('/api/forum', forumRoutes);
    this.app.use('/api/memos', memoRoutes);
    this.app.use('/api/routines', routineRoutes);
    this.app.use('/api/attendance', attendanceRoutes);
    this.app.use('/api/performance', performanceRoutes);
    this.app.use('/api/chat', chatRoutes);
    // system route (optional)
    // this.app.use('/api/system', systemRoutes);

    // 版本資訊端點
    this.app.get('/api/version', (req, res) => {
      const version = '2.0.3';
      const buildDate = new Date().toISOString();
      res.json({
        version,
        buildDate,
        changelog: {
          'v2.0.3': '修復部門更新不保存的問題',
          'v2.0.2': '修復新增用戶和部門後不即時顯示的問題',
          'v2.0.1': '移除多餘的預設部門，只保留管理部',
          'v2.0.0': '修復認證中間件錯誤，從本地源代碼重新構建',
          'v1.0.0': '初始版本'
        }
      });
    });

    // 健康檢查端點
    this.app.get('/api/health', async (req, res) => {
      try {
        const stats = await this.db.getStats();
        res.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '2.0.3',
          uptime: process.uptime(),
          database: stats
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // PWA 支援（所有前端路由都返回 index.html）
    this.app.get('*', (req, res) => {
      const frontendPath = path.join(__dirname, '../../frontend/dist/index.html');
      if (fs.existsSync(frontendPath)) {
        res.sendFile(frontendPath);
      } else {
        res.status(404).json({ error: '前端應用未找到' });
      }
    });
  }

  private initializeErrorHandling(): void {
    // 全域錯誤處理
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('伺服器錯誤:', err);
      
      // 不暴露敏感錯誤資訊
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(err.status || 500).json({
        error: isDevelopment ? err.message : '伺服器內部錯誤',
        ...(isDevelopment && { stack: err.stack })
      });
    });
  }

  private async generateSelfSignedCert(): Promise<{ key: string, cert: string }> {
    const certPath = path.join(this.config.dataPath, 'certificates');
    const keyPath = path.join(certPath, 'server.key');
    const certPathFile = path.join(certPath, 'server.crt');

    // 如果憑證已存在，直接返回
    if (fs.existsSync(keyPath) && fs.existsSync(certPathFile)) {
      return {
        key: fs.readFileSync(keyPath, 'utf8'),
        cert: fs.readFileSync(certPathFile, 'utf8')
      };
    }

    // 生成新的自簽憑證
    const { execSync } = require('child_process');
    
    if (!fs.existsSync(certPath)) {
      fs.mkdirSync(certPath, { recursive: true });
    }

    try {
      // 使用 OpenSSL 生成自簽憑證
      const opensslConfig = path.join(certPath, 'openssl.conf');
      const configContent = `
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = TW
ST = Taiwan
L = Taipei
O = TaskFlow Pro
OU = IT Department
CN = TaskFlow Pro Server

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.local
IP.1 = 127.0.0.1
IP.2 = ::1
`;

      fs.writeFileSync(opensslConfig, configContent);

      // 生成私鑰和憑證
      execSync(`openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPathFile}" -config "${opensslConfig}"`, { stdio: 'inherit' });

      console.log('✅ 自簽 HTTPS 憑證已生成');
      console.log(`📁 憑證位置: ${certPath}`);
      console.log('⚠️  請將 server.crt 安裝到員工手機的信任憑證清單中');

      return {
        key: fs.readFileSync(keyPath, 'utf8'),
        cert: fs.readFileSync(certPathFile, 'utf8')
      };
    } catch (error) {
      console.warn('⚠️ 無法生成 HTTPS 憑證，將使用 HTTP 模式:', error);
      return { key: '', cert: '' };
    }
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 啟動 TaskFlow Pro 伺服器...');
      console.log(`📁 資料路徑: ${this.config.dataPath}`);
      console.log(`📁 上傳路徑: ${this.config.uploadsPath}`);

      // 初始化資料庫
      console.log('📊 初始化資料庫...');
      await this.db.initialize();
      console.log('✅ 資料庫初始化完成');

      // 顯示資料庫統計
      const stats = await this.db.getStats();
      console.log(`📈 資料庫統計: 用戶 ${stats.users} | 任務 ${stats.tasks} | 出勤 ${stats.attendance} | 財務 ${stats.finance}`);

      // 啟動 HTTP/HTTPS 伺服器
      if (this.config.httpsEnabled) {
        console.log('🔐 設定 HTTPS...');
        const { key, cert } = await this.generateSelfSignedCert();
        
        if (key && cert) {
          this.server = https.createServer({ key, cert }, this.app);
          console.log('🔒 HTTPS 憑證已載入');
        } else {
          this.server = require('http').createServer(this.app);
          console.log('⚠️ 使用 HTTP 模式（建議啟用 HTTPS）');
        }
      } else {
        this.server = require('http').createServer(this.app);
        console.log('🌐 HTTP 模式');
      }

      // 啟動伺服器
      this.server.listen(this.config.port, '0.0.0.0', () => {
        const protocol = this.config.httpsEnabled ? 'https' : 'http';
        const localUrl = `${protocol}://localhost:${this.config.port}`;
        
        console.log('');
        console.log('🎉 TaskFlow Pro 伺服器已啟動！');
        console.log(`📱 本地訪問: ${localUrl}`);
        console.log(`🌐 網路訪問: ${protocol}://[您的IP]:${this.config.port}`);
        console.log('');
        console.log('🔧 管理工具:');
        console.log(`   健康檢查: ${localUrl}/api/health`);
        console.log(`   系統備份: ${localUrl}/api/system/export`);
        console.log('');
        console.log('📋 員工訪問說明:');
        console.log('1. 在手機瀏覽器輸入上述網址');
        console.log('2. 如為 HTTPS，請信任並安裝憑證');
        console.log('3. 點擊「加入主畫面」安裝 PWA');
        console.log('4. 使用分配的帳號密碼登入');
        console.log('');
        console.log('🛡️ 安全提醒:');
        console.log('- 定期備份資料庫檔案');
        console.log('- 妥善保管資料庫加密金鑰');
        console.log('- 定期更新系統和依賴');
        console.log('');
      });

      // 優雅關閉處理
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('❌ 伺服器啟動失敗:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    console.log('\n🛑 正在關閉伺服器...');
    
    if (this.server) {
      this.server.close(() => {
        console.log('✅ HTTP 伺服器已關閉');
      });
    }

    if (this.db) {
      await this.db.close();
      console.log('✅ 資料庫連線已關閉');
    }

    console.log('👋 TaskFlow Pro 伺服器已完全關閉');
    process.exit(0);
  }

  // 取得伺服器實例（用於測試）
  getApp(): express.Application {
    return this.app;
  }

  // 取得資料庫實例
  getDatabase(): SecureDatabase {
    return this.db;
  }
}
