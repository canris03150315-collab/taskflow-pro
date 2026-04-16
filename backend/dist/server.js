"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskFlowServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const database_v2_1 = require("./database-v2");
const auth_1 = require("./routes/auth");
const users_1 = require("./routes/users");
const tasks_1 = require("./routes/tasks");
const departments_1 = require("./routes/departments");
const attendance_1 = require("./routes/attendance");
const sync_1 = require("./routes/sync");
const reports_1 = require("./routes/reports");
const finance_1 = require("./routes/finance");
const forum_1 = require("./routes/forum");
const memos_1 = require("./routes/memos");
const routines_1 = require("./routes/routines");
const performance_1 = require("./routes/performance");
const chat_1 = require("./routes/chat");
const announcements_1 = require("./routes/announcements");
const version_1 = require("./routes/version");
const system_1 = require("./routes/system");
const leaves_1 = require("./routes/leaves");
const schedules_1 = require("./routes/schedules");
const platformRevenueRoutes = require("./routes/platform-revenue");
const workLogsRoutes = require("./routes/work-logs");
class TaskFlowServer {
    constructor(config = {}) {
        this.config = {
            port: config.port || 5000,
            httpsEnabled: config.httpsEnabled !== false,
            dataPath: config.dataPath || './data',
            uploadsPath: config.uploadsPath || './data/uploads'
        };
        this.app = (0, express_1.default)();
        this.wsServer = null;
        // Trust proxy for Netlify reverse proxy
        this.app.set('trust proxy', 1);
        this.db = new database_v2_1.SecureDatabase(path_1.default.join(this.config.dataPath, 'taskflow.db'));
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddleware() {
        // 安全性中間件
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.sheetjs.com"],
                    imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
                    connectSrc: ["'self'", "ws:", "wss:"]
                }
            }
        }));
        // CORS 配置（支援行動裝置）
        this.app.use((0, cors_1.default)({
            origin: ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000', 'https://transcendent-basbousa-6df2d2.netlify.app', 'http://165.227.147.40:3000', 'https://165.227.147.40:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        // 壓縮響應
        this.app.use((0, compression_1.default)());
        // 請求限制（防止濫用）
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000, // 15 分鐘
            max: 1000, // 每個 IP 最多 1000 次請求
            message: { error: '請求過於頻繁，請稍後再試' },
            standardHeaders: true,
            legacyHeaders: false,
            validate: false
        });
        this.app.use('/api', limiter);
        // 請求解析
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // 靜態檔案服務（前端 PWA）
        const frontendPath = path_1.default.join(__dirname, '../../frontend/dist');
        if (fs_1.default.existsSync(frontendPath)) {
            this.app.use(express_1.default.static(frontendPath, {
                maxAge: '1d',
                etag: true,
                lastModified: true
            }));
        }
        // 上傳檔案服務
        if (!fs_1.default.existsSync(this.config.uploadsPath)) {
            fs_1.default.mkdirSync(this.config.uploadsPath, { recursive: true });
        }
        this.app.use('/uploads', express_1.default.static(this.config.uploadsPath));
        // 請求日誌
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            // 資料庫中介軟體
            req.db = this.db;
            req.wsServer = this.app.get('wsServer');
            next();
        });
    }
    initializeRoutes() {
        // API 路由
        this.app.use('/api/auth', auth_1.authRoutes);
        this.app.use('/api/users', users_1.userRoutes);
        this.app.use('/api/departments', departments_1.departmentRoutes);
        this.app.use('/api/tasks', tasks_1.taskRoutes);
        this.app.use('/api/attendance', attendance_1.attendanceRoutes);
        this.app.use('/api/sync', sync_1.syncRoutes);
        // announcements route (optional)
        this.app.use('/api/announcements', announcements_1.announcementsRoutes);
        this.app.use('/api/reports', reports_1.reportRoutes);
        this.app.use('/api/work-logs', workLogsRoutes);
        this.app.use('/api/finance', finance_1.financeRoutes);
        this.app.use('/api/forum', forum_1.forumRoutes);
        this.app.use('/api/memos', memos_1.memoRoutes);
        this.app.use('/api/routines', routines_1.routineRoutes);
        this.app.use('/api/attendance', attendance_1.attendanceRoutes);
        this.app.use('/api/performance', performance_1.performanceRoutes);
        this.app.use('/api/chat', chat_1.chatRoutes);
        this.app.use('/api/version', version_1.versionRoutes);
        this.app.use('/api/system', system_1.systemRoutes);
        this.app.use('/api/leaves', leaves_1.leavesRoutes);
        this.app.use('/api/schedules', schedules_1.schedulesRoutes(this.db, this.wsServer));
                this.app.use('/api/kol', require('./routes/kol'));
        this.app.use('/api/ai-assistant', require('./routes/ai-assistant'));
        this.app.use('/api/platform-accounts', require('./routes/platform-accounts'));
        this.app.use('/api/backup', require('./routes/backup'));
        // this.app.use('/api/platform-revenue', platformRevenueRoutes); // replaced by platform-accounts
        // system route (optional)
        // this.app.use('/api/system', systemRoutes);

        // Subsidiary mode: expose service API for central hub (only in subsidiary mode)
        if (process.env.SERVICE_TOKEN && process.env.INSTANCE_MODE !== 'central') {
            const serviceApiRoutes = require('./routes/service-api');
            this.app.use('/api/service', serviceApiRoutes);
            console.log('[TaskFlow] Service API enabled (subsidiary mode)');
        }

        // Central mode: expose central hub management APIs
        if (process.env.INSTANCE_MODE === 'central') {
            const { router: subsidiariesRouter, initSubsidiariesTable } = require('./routes/central/subsidiaries');
            const gatewayRouter = require('./routes/central/gateway');
            const superAiRouter = require('./routes/central/super-ai');
            const dashboardRouter = require('./routes/central/dashboard');

            // Note: initSubsidiariesTable will be called in start() after db.initialize()
            this._initSubsidiariesTable = initSubsidiariesTable;

            // Register central hub routes
            this.app.use('/api/central/subsidiaries', subsidiariesRouter);
            this.app.use('/api/central/gateway', gatewayRouter);
            this.app.use('/api/central/super-ai', superAiRouter);
            this.app.use('/api/central/dashboard', dashboardRouter);
            console.log('[TaskFlow] Central hub routes enabled (central mode)');
        }

        // 健康檢查端點
        this.app.get('/api/health', async (req, res) => {
            try {
                const stats = await this.db.getStats();
                res.json({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    uptime: process.uptime(),
                    database: stats
                });
            }
            catch (error) {
                res.status(500).json({
                    status: 'error',
                    error: error.message
                });
            }
        });
        // API 路徑未匹配 → 返回 404 JSON（不要 fallback 到 index.html）
        this.app.all('/api/*', (req, res) => {
            res.status(404).json({ error: 'API endpoint not found', path: req.path });
        });
        // PWA 支援（非 API 路徑的前端路由返回 index.html）
        this.app.get('*', (req, res) => {
            const frontendPath = path_1.default.join(__dirname, '../../frontend/dist/index.html');
            if (fs_1.default.existsSync(frontendPath)) {
                res.sendFile(frontendPath);
            }
            else {
                res.status(404).json({ error: '前端應用未找到' });
            }
        });
    }
    initializeErrorHandling() {
        // 全域錯誤處理
        this.app.use((err, req, res, next) => {
            console.error('伺服器錯誤:', err);
            // 不暴露敏感錯誤資訊
            const isDevelopment = process.env.NODE_ENV === 'development';
            res.status(err.status || 500).json({
                error: isDevelopment ? err.message : '伺服器內部錯誤',
                ...(isDevelopment && { stack: err.stack })
            });
        });
    }
    async generateSelfSignedCert() {
        const certPath = path_1.default.join(this.config.dataPath, 'certificates');
        const keyPath = path_1.default.join(certPath, 'server.key');
        const certPathFile = path_1.default.join(certPath, 'server.crt');
        // 如果憑證已存在，直接返回
        if (fs_1.default.existsSync(keyPath) && fs_1.default.existsSync(certPathFile)) {
            return {
                key: fs_1.default.readFileSync(keyPath, 'utf8'),
                cert: fs_1.default.readFileSync(certPathFile, 'utf8')
            };
        }
        // 生成新的自簽憑證
        const { execSync } = require('child_process');
        if (!fs_1.default.existsSync(certPath)) {
            fs_1.default.mkdirSync(certPath, { recursive: true });
        }
        try {
            // 使用 OpenSSL 生成自簽憑證
            const opensslConfig = path_1.default.join(certPath, 'openssl.conf');
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
            fs_1.default.writeFileSync(opensslConfig, configContent);
            // 生成私鑰和憑證
            execSync(`openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPathFile}" -config "${opensslConfig}"`, { stdio: 'inherit' });
            console.log('✅ 自簽 HTTPS 憑證已生成');
            console.log(`📁 憑證位置: ${certPath}`);
            console.log('⚠️  請將 server.crt 安裝到員工手機的信任憑證清單中');
            return {
                key: fs_1.default.readFileSync(keyPath, 'utf8'),
                cert: fs_1.default.readFileSync(certPathFile, 'utf8')
            };
        }
        catch (error) {
            console.warn('⚠️ 無法生成 HTTPS 憑證，將使用 HTTP 模式:', error);
            return { key: '', cert: '' };
        }
    }
    async start() {
        try {
            console.log('🚀 啟動 TaskFlow Pro 伺服器...');
            console.log(`📁 資料路徑: ${this.config.dataPath}`);
            console.log(`📁 上傳路徑: ${this.config.uploadsPath}`);
            // 初始化資料庫
            console.log('📊 初始化資料庫...');
            await this.db.initialize();
            console.log('✅ 資料庫初始化完成');
            // Initialize central hub tables after DB is ready
            if (this._initSubsidiariesTable) {
                this._initSubsidiariesTable(this.db);
            }
            // 顯示資料庫統計
            const stats = await this.db.getStats();
            console.log(`📈 資料庫統計: 用戶 ${stats.users} | 任務 ${stats.tasks} | 出勤 ${stats.attendance} | 財務 ${stats.finance}`);
            // 啟動 HTTP/HTTPS 伺服器
            if (this.config.httpsEnabled) {
                console.log('🔐 設定 HTTPS...');
                const { key, cert } = await this.generateSelfSignedCert();
                if (key && cert) {
                    this.server = https_1.default.createServer({ key, cert }, this.app);
                    console.log('🔒 HTTPS 憑證已載入');
                }
                else {
                    this.server = require('http').createServer(this.app);
                    console.log('⚠️ 使用 HTTP 模式（建議啟用 HTTPS）');
                }
            }
            else {
                this.server = require('http').createServer(this.app);
                console.log('🌐 HTTP 模式');
            }
            // 啟動伺服器
            
            // HTTP server on separate port (only when HTTPS is enabled, to have both)
            if (this.config.httpsEnabled) {
                const http = require('http');
                this.httpServer = http.createServer(this.app);
                const httpPort = parseInt(process.env.HTTP_PORT || '3001');
                this.httpServer.listen(httpPort, '0.0.0.0', () => {
                    console.log(`\u2705 HTTP \u4f3a\u670d\u5668\u5df2\u555f\u52d5\u65bc\u7aef\u53e3 ${httpPort}`);
                });
            }
            this.server.listen(this.config.port, '0.0.0.0', () => {
                const protocol = this.config.httpsEnabled ? 'https' : 'http';
                const localUrl = `${protocol}://localhost:${this.config.port}`;
                console.log('');
                console.log('🎉 TaskFlow Pro 伺服器已啟動！');
                // Initialize WebSocket server
                try {
                    const ChatWebSocketServer = require('./websocket-server');
                    this.wsServer = new ChatWebSocketServer(this.server);
                    this.app.set('wsServer', this.wsServer);

                    // Wire up websocket bridge for chat.js
                    try {
                        const wsBridge = require('./websocket');
                        wsBridge.setWsServer(this.wsServer);
                        console.log('\u2705 WebSocket bridge \u5df2\u9023\u63a5');
                    } catch (bridgeErr) {
                        console.error('\u26A0\uFE0F WebSocket bridge \u9023\u63a5\u5931\u6557:', bridgeErr.message);
                    }

                    // Also attach WS to HTTP server (when HTTPS mode has separate HTTP port)
                    if (this.httpServer) {
                        try {
                            const ChatWebSocketServer2 = require('./websocket-server');
                            this.wsServerHttp = new ChatWebSocketServer2(this.httpServer);
                            console.log('\u2705 WebSocket \u4F3A\u670D\u5668\u5DF2\u555F\u52D5\u65BC /ws (HTTPS + HTTP)');
                        } catch (wsErr2) {
                            console.log('\u2705 WebSocket \u4F3A\u670D\u5668\u5DF2\u555F\u52D5\u65BC /ws (HTTPS only)');
                        }
                    } else {
                        console.log('\u2705 WebSocket \u4F3A\u670D\u5668\u5DF2\u555F\u52D5\u65BC /ws');
                    }
                } catch (wsError) {
                    console.error('\u26A0\uFE0F WebSocket \u555F\u52D5\u5931\u6557:', wsError.message);
                }
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
        }
        catch (error) {
            console.error('❌ 伺服器啟動失敗:', error);
            process.exit(1);
        }
    }
    async shutdown() {
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
    getApp() {
        return this.app;
    }
    // 取得資料庫實例
    getDatabase() {
        return this.db;
    }
}
exports.TaskFlowServer = TaskFlowServer;
//# sourceMappingURL=server.js.map