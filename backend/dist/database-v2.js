"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureDatabase = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
// 加密配置
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_LENGTH = 32;
class SecureDatabase {
    constructor(dbPath = './data/taskflow.db', keyPath) {
        this.db = null;
        this.dbPath = path_1.default.resolve(dbPath);
        this.keyPath = keyPath || path_1.default.join(path_1.default.dirname(dbPath), '.db-key');
        this.encryptionKey = this.loadOrCreateEncryptionKey();
    }
    loadOrCreateEncryptionKey() {
        if (fs_1.default.existsSync(this.keyPath)) {
            const keyHex = fs_1.default.readFileSync(this.keyPath, 'utf8');
            return Buffer.from(keyHex, 'hex');
        }
        const key = (0, crypto_1.randomBytes)(ENCRYPTION_KEY_LENGTH);
        fs_1.default.writeFileSync(this.keyPath, key.toString('hex'));
        fs_1.default.chmodSync(this.keyPath, 0o600); // 僅擁有者可讀寫
        return key;
    }
    // 加密敏感資料
    encrypt(text) {
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    }
    // 解密敏感資料
    decrypt(encryptedText) {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const decipher = (0, crypto_1.createDecipheriv)(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    runMigrations() {
        if (!this.db) return;
        const migrations = [
            { table: 'announcements', col: 'updated_at', sql: 'ALTER TABLE announcements ADD COLUMN updated_at DATETIME' },
            { table: 'announcements', col: 'images', sql: "ALTER TABLE announcements ADD COLUMN images TEXT DEFAULT '[]'" },
            { table: 'attendance_records', col: 'work_hours', sql: 'ALTER TABLE attendance_records ADD COLUMN work_hours REAL' },
            { table: 'attendance_records', col: 'is_manual', sql: 'ALTER TABLE attendance_records ADD COLUMN is_manual BOOLEAN DEFAULT 0' },
            { table: 'attendance_records', col: 'manual_by', sql: 'ALTER TABLE attendance_records ADD COLUMN manual_by TEXT' },
            { table: 'attendance_records', col: 'manual_reason', sql: 'ALTER TABLE attendance_records ADD COLUMN manual_reason TEXT' },
            { table: 'attendance_records', col: 'manual_at', sql: 'ALTER TABLE attendance_records ADD COLUMN manual_at DATETIME' },
        ];
        for (const m of migrations) {
            try {
                const cols = this.db.prepare(`PRAGMA table_info(${m.table})`).all();
                const hasCol = cols.some(c => c.name === m.col);
                if (!hasCol) {
                    this.db.prepare(m.sql).run();
                    console.log(`[Migration] Added ${m.table}.${m.col}`);
                }
            } catch (e) {
                console.warn(`[Migration] Skipped ${m.table}.${m.col}:`, e.message);
            }
        }
    }
    async initialize() {
        try {
            // 確保資料目錄存在
            const dbDir = path_1.default.dirname(this.dbPath);
            if (!fs_1.default.existsSync(dbDir)) {
                fs_1.default.mkdirSync(dbDir, { recursive: true });
            }
            // 開啟資料庫
            this.db = new better_sqlite3_1.default(this.dbPath);
            // 設定資料庫選項
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 10000');
            this.db.pragma('temp_store = memory');
            // 初始化表格
            await this.initializeTables();
            // Schema migrations: add missing columns to existing tables
            this.runMigrations();
            console.log('✅ 資料庫初始化完成（使用 better-sqlite3 + AES 加密）');
        }
        catch (error) {
            console.error('❌ 資料庫初始化失敗:', error);
            throw error;
        }
    }
    async initializeTables() {
        if (!this.db)
            throw new Error('資料庫未初始化');
        const tables = [
            // 用戶表
            `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('BOSS', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE')),
        department TEXT NOT NULL,
        avatar TEXT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        permissions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            // 部門表
            `CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        theme TEXT NOT NULL CHECK (theme IN ('slate', 'blue', 'purple', 'rose', 'emerald', 'orange', 'cyan')),
        icon TEXT NOT NULL
      )`,
            // 任務表（支援部門和個人分配）
            `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        urgency TEXT NOT NULL CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical', 'low', 'medium', 'high', 'urgent', '低', '中', '高', '緊急')),
        deadline DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT '待接取' CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Completed', 'Cancelled', '待接取', '已指派', '進行中', '已完成', '已取消')),
        target_department TEXT,
        assigned_to_user_id TEXT,
        assigned_to_department TEXT,
        accepted_by_user_id TEXT,
        completion_notes TEXT,
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        created_by TEXT NOT NULL,
        is_archived BOOLEAN DEFAULT FALSE,
        last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        offline_pending BOOLEAN DEFAULT FALSE
      )`,
            // 任務時間軸表
            `CREATE TABLE IF NOT EXISTS task_timeline (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        progress INTEGER NOT NULL,
        is_offline BOOLEAN DEFAULT FALSE,
        synced_at DATETIME,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )`,
            // 離線同步佇列表
            `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action_type TEXT NOT NULL, -- 'create', 'update', 'delete'
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        data TEXT, -- JSON 格式的資料
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
        error_message TEXT
      )`,
            // 其他表格保持不變...
            `CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'IMPORTANT', 'URGENT')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        read_by TEXT,
        images TEXT DEFAULT '[]'
      )`,
            `CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date DATE NOT NULL,
        clock_in DATETIME NOT NULL,
        clock_out DATETIME,
        duration_minutes INTEGER,
        status TEXT NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE')),
        location_lat REAL,
        location_lng REAL,
        location_address TEXT,
        is_offline BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS system_logs (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'INFO' CHECK (level IN ('INFO', 'WARNING', 'DANGER'))
      )`,
            `CREATE TABLE IF NOT EXISTS finance_records (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
        status TEXT NOT NULL DEFAULT 'PENDING',
        category TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        scope TEXT NOT NULL DEFAULT 'DEPARTMENT',
        department_id TEXT,
        user_id TEXT,
        owner_id TEXT,
        recorded_by TEXT,
        confirmed_by TEXT,
        confirmed_at DATETIME,
        attachment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS routine_templates (
        id TEXT PRIMARY KEY,
        department_id TEXT,
        title TEXT NOT NULL,
        items TEXT DEFAULT '[]',
        last_updated TEXT,
        is_daily INTEGER DEFAULT 0,
        read_by TEXT DEFAULT '[]'
      )`,
            `CREATE TABLE IF NOT EXISTS routine_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        department_id TEXT,
        date TEXT NOT NULL,
        template_id TEXT,
        items TEXT DEFAULT '[]',
        completed INTEGER DEFAULT 0,
        total INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS kol_profiles (
        id TEXT PRIMARY KEY,
        platform TEXT DEFAULT 'FACEBOOK',
        platform_id TEXT,
        facebook_id TEXT,
        platform_account TEXT,
        contact_info TEXT,
        status TEXT DEFAULT 'ACTIVE',
        status_color TEXT DEFAULT 'green',
        weekly_pay_note TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        department_id TEXT
      )`,
            `CREATE TABLE IF NOT EXISTS kol_weekly_payments (
        id TEXT PRIMARY KEY,
        kol_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_date TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
      )`,
            `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'DAILY',
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        content TEXT,
        ai_summary TEXT,
        ai_mood TEXT,
        manager_feedback TEXT,
        reviewed_by TEXT
      )`,
            `CREATE TABLE IF NOT EXISTS suggestions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'other',
        is_anonymous INTEGER DEFAULT 0,
        author_id TEXT NOT NULL,
        target_dept_id TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        upvotes TEXT DEFAULT '[]',
        comments TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status_changed_by TEXT,
        status_changed_at DATETIME
      )`,
            `CREATE TABLE IF NOT EXISTS memos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'TEXT',
        content TEXT,
        todos TEXT,
        color TEXT NOT NULL DEFAULT '#fef3c7',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS work_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        department_id TEXT,
        date TEXT NOT NULL,
        today_tasks TEXT,
        tomorrow_tasks TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS leave_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        department_id TEXT,
        leave_type TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        start_period TEXT DEFAULT 'FULL',
        end_period TEXT DEFAULT 'FULL',
        days REAL NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        has_conflict INTEGER DEFAULT 0,
        conflict_details TEXT,
        proxy_user_id TEXT,
        approver_id TEXT,
        approval_notes TEXT,
        conflict_override INTEGER DEFAULT 0,
        approved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS department_leave_rules (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL,
        max_concurrent_leaves INTEGER DEFAULT 2,
        min_on_duty_staff INTEGER DEFAULT 3,
        min_advance_days INTEGER DEFAULT 3,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        department_id TEXT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        selected_days TEXT DEFAULT '[]',
        total_days INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'PENDING',
        has_conflict INTEGER DEFAULT 0,
        conflict_details TEXT,
        reviewed_by TEXT,
        reviewed_at DATETIME,
        review_notes TEXT,
        submitted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS schedule_rules (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL,
        max_days_per_month INTEGER DEFAULT 8,
        submission_deadline INTEGER DEFAULT 25,
        min_on_duty_staff INTEGER DEFAULT 3,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS approval_audit_log (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        target_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
        ];
        // 執行表格創建
        for (const sql of tables) {
            try {
                this.db.exec(sql);
            }
            catch (error) {
                console.error('創建表格失敗:', sql, error);
                throw error;
            }
        }
        // 創建索引
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
            'CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)',
            'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
            'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id)',
            'CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(assigned_to_department)',
            'CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)',
            'CREATE INDEX IF NOT EXISTS idx_tasks_sync ON tasks(last_synced_at)',
            'CREATE INDEX IF NOT EXISTS idx_timeline_task ON task_timeline(task_id)',
            'CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp)'
        ];
        for (const sql of indexes) {
            try {
                this.db.exec(sql);
            }
            catch (error) {
                console.warn('創建索引失敗:', sql, error);
            }
        }
        // 插入預設部門
        await this.insertDefaultDepartments();
    }
    async insertDefaultDepartments() {
        if (!this.db)
            throw new Error('資料庫未初始化');
        const defaultDepts = [
            { id: 'Management', name: '營運管理部', theme: 'slate', icon: '💼' },
            { id: 'UNASSIGNED', name: '待分配 / 新人', theme: 'slate', icon: '🔰' }
        ];
        const insertDept = this.db.prepare(`
      INSERT OR IGNORE INTO departments (id, name, theme, icon) 
      VALUES (?, ?, ?, ?)
    `);
        for (const dept of defaultDepts) {
            insertDept.run(dept.id, dept.name, dept.theme, dept.icon);
        }
    }
    // 基礎資料庫操作方法
    async run(sql, params = []) {
        if (!this.db)
            throw new Error('資料庫未初始化');
        const stmt = this.db.prepare(sql);
        stmt.run(...params);
    }
    async get(sql, params = []) {
        if (!this.db)
            throw new Error('資料庫未初始化');
        const stmt = this.db.prepare(sql);
        return stmt.get(...params);
    }
    async all(sql, params = []) {
        if (!this.db)
            throw new Error('資料庫未初始化');
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }
    // 事務支援
    transaction(fn) {
        if (!this.db)
            throw new Error('資料庫未初始化');
        return this.db.transaction(fn)();
    }
    // 離線同步支援
    async addToSyncQueue(userId, actionType, tableName, recordId, data) {
        const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await this.run(`INSERT INTO sync_queue (id, user_id, action_type, table_name, record_id, data) 
       VALUES (?, ?, ?, ?, ?, ?)`, [syncId, userId, actionType, tableName, recordId, data ? JSON.stringify(data) : null]);
    }
    async getSyncQueue(userId) {
        return this.all('SELECT * FROM sync_queue WHERE user_id = ? AND status = "pending" ORDER BY timestamp ASC', [userId]);
    }
    async markSynced(syncId) {
        await this.run('UPDATE sync_queue SET status = "synced", synced_at = datetime("now") WHERE id = ?', [syncId]);
    }
    async markSyncFailed(syncId, errorMessage) {
        await this.run('UPDATE sync_queue SET status = "failed", error_message = ?, retry_count = retry_count + 1 WHERE id = ?', [errorMessage, syncId]);
    }
    // 資料庫備份
    async backup(backupPath) {
        if (!this.db)
            throw new Error('資料庫未初始化');
        // 備份資料庫檔案
        fs_1.default.copyFileSync(this.dbPath, backupPath);
        // 備份加密金鑰
        const keyBackupPath = backupPath.replace('.db', '.key');
        fs_1.default.copyFileSync(this.keyPath, keyBackupPath);
    }
    // 異步包裝器方法
    async getAsync(sql, params = []) {
        return this.get(sql, params);
    }
    async allAsync(sql, params = []) {
        return this.all(sql, params);
    }
    async runAsync(sql, params = []) {
        this.run(sql, params);
    }
    // 異步事務包裝器
    transactionAsync(fn) {
        return this.transaction(fn);
    }
    // 系統日誌方法
    logAction(userId, userName, action, details, level) {
        const log = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            user_id: userId,
            user_name: userName,
            action,
            details,
            level
        };
        this.run(`INSERT INTO system_logs (id, timestamp, user_id, user_name, action, details, level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [log.id, log.timestamp, log.user_id, log.user_name, log.action, log.details, log.level]);
    }
    async getStats() {
        const usersCount = await this.get('SELECT COUNT(*) as count FROM users');
        const tasksCount = await this.get('SELECT COUNT(*) as count FROM tasks');
        const attendanceCount = await this.get('SELECT COUNT(*) as count FROM attendance_records');
        const pendingSyncs = await this.get('SELECT COUNT(*) as count FROM sync_queue WHERE status = ?', ['pending']);
        return {
            users: usersCount?.count || 0,
            tasks: tasksCount?.count || 0,
            attendance: attendanceCount?.count || 0,
            finance: 0, // 財務模組尚未實作
            pending_syncs: pendingSyncs?.count || 0,
            timestamp: new Date().toISOString()
        };
    }
    // 用戶管理方法
    getUsers() {
        return this.all('SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users ORDER BY name');
    }
    getUserById(id) {
        return this.get('SELECT * FROM users WHERE id = ?', [id]);
    }
    getUserByUsername(username) {
        return this.get('SELECT * FROM users WHERE username = ?', [username]);
    }
    createUser(user) {
        this.run(`
      INSERT INTO users (id, name, role, department, avatar, username, password, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            user.id,
            user.name,
            user.role,
            user.department,
            user.avatar || '',
            user.username,
            user.password,
            JSON.stringify(user.permissions || []),
            new Date().toISOString(),
            new Date().toISOString()
        ]);
    }
    updateUser(id, updates) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (fields.length > 0) {
            fields.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(id);
            this.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
        }
    }
    deleteUser(id) {
        this.run('DELETE FROM users WHERE id = ?', [id]);
    }
    // 部門管理方法
    getDepartments() {
        return this.all('SELECT * FROM departments ORDER BY name');
    }
    getDepartmentById(id) {
        return this.get('SELECT * FROM departments WHERE id = ?', [id]);
    }
    createDepartment(department) {
        this.run(`
      INSERT INTO departments (id, name, theme, icon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
            department.id,
            department.name,
            department.theme,
            department.icon,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
    }
    updateDepartment(id, updates) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (fields.length > 0) {
            fields.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(id);
            this.run(`UPDATE departments SET ${fields.join(', ')} WHERE id = ?`, values);
        }
    }
    deleteDepartment(id) {
        this.run('DELETE FROM departments WHERE id = ?', [id]);
    }
    // 任務管理方法
    getTasks(filters = {}) {
        let query = 'SELECT * FROM tasks WHERE 1=1';
        const params = [];
        if (filters.assigned_to_user_id) {
            query += ' AND assigned_to_user_id = ?';
            params.push(filters.assigned_to_user_id);
        }
        if (filters.assigned_to_department) {
            query += ' AND assigned_to_department = ?';
            params.push(filters.assigned_to_department);
        }
        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }
        query += ' ORDER BY created_at DESC';
        return this.all(query, params);
    }
    getTaskById(id) {
        return this.get('SELECT * FROM tasks WHERE id = ?', [id]);
    }
    createTask(task) {
        this.run(`
      INSERT INTO tasks (
        id, title, description, urgency, deadline, status,
        progress, created_by, target_department, assigned_to_user_id,
        assigned_to_department, offline_pending, last_synced_at, version,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            task.id,
            task.title,
            task.description || '',
            task.urgency,
            task.deadline || null,
            task.status || 'Open',
            task.progress || 0,
            task.created_by,
            task.target_department || null,
            task.assigned_to_user_id || null,
            task.assigned_to_department || null,
            task.offline_pending || false,
            task.last_synced_at || null,
            task.version || 1,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
    }
    updateTask(id, updates) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (fields.length > 0) {
            fields.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(id);
            this.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
        }
    }
    deleteTask(id) {
        this.run('DELETE FROM tasks WHERE id = ?', [id]);
    }
    // 出勤管理方法
    getAttendanceRecords(userId, filters = {}) {
        let query = 'SELECT * FROM attendance_records WHERE user_id = ?';
        const params = [userId];
        if (filters.date_from) {
            query += ' AND date >= ?';
            params.push(filters.date_from);
        }
        if (filters.date_to) {
            query += ' AND date <= ?';
            params.push(filters.date_to);
        }
        query += ' ORDER BY date DESC';
        return this.all(query, params);
    }
    getAttendanceById(id) {
        return this.get('SELECT * FROM attendance_records WHERE id = ?', [id]);
    }
    createAttendance(record) {
        this.run(`
      INSERT INTO attendance_records (
        id, user_id, date, clock_in, clock_out, duration_minutes,
        status, location_lat, location_lng, location_address, is_offline, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            record.id,
            record.user_id,
            record.date,
            record.clock_in,
            record.clock_out || null,
            record.duration_minutes || null,
            record.status || 'ONLINE',
            record.location_lat || null,
            record.location_lng || null,
            record.location_address || '',
            record.is_offline || false,
            new Date().toISOString()
        ]);
    }
    updateAttendance(id, updates) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (fields.length > 0) {
            values.push(id);
            this.run(`UPDATE attendance_records SET ${fields.join(', ')} WHERE id = ?`, values);
        }
    }
    // 同步佇列方法（更新現有實作）
    getSyncQueue(userId) {
        return this.all('SELECT * FROM sync_queue WHERE user_id = ? AND status = "pending" ORDER BY created_at ASC', [userId]);
    }
    addToSyncQueue(userId, action, table, recordId, data) {
        const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.run(`INSERT INTO sync_queue (id, user_id, action_type, table_name, record_id, data, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`, [syncId, userId, action, table, recordId, data ? JSON.stringify(data) : null, new Date().toISOString(), new Date().toISOString()]);
    }
    markSyncCompleted(queueId) {
        this.run('UPDATE sync_queue SET status = "synced", updated_at = ? WHERE id = ?', [new Date().toISOString(), queueId]);
    }
    getFailedSyncs(userId) {
        return this.all('SELECT * FROM sync_queue WHERE user_id = ? AND status = "failed" ORDER BY updated_at DESC', [userId]);
    }
    retryFailedSync(userId, queueId) {
        try {
            const syncItem = this.get('SELECT * FROM sync_queue WHERE id = ? AND user_id = ? AND status = "failed"', [queueId, userId]);
            if (!syncItem || syncItem.retry_count >= 5) {
                return false;
            }
            this.run('UPDATE sync_queue SET status = "pending", retry_count = retry_count + 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), queueId]);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
exports.SecureDatabase = SecureDatabase;
//# sourceMappingURL=database-v2.js.map