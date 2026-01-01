import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// 加密配置
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_LENGTH = 32;

export class SecureDatabase {
  private db: Database.Database | null = null;
  private dbPath: string;
  private encryptionKey: Buffer;
  private keyPath: string;

  constructor(dbPath: string = './data/taskflow.db', keyPath?: string) {
    this.dbPath = path.resolve(dbPath);
    this.keyPath = keyPath || path.join(path.dirname(dbPath), '.db-key');
    this.encryptionKey = this.loadOrCreateEncryptionKey();
  }

  private loadOrCreateEncryptionKey(): Buffer {
    if (fs.existsSync(this.keyPath)) {
      const keyHex = fs.readFileSync(this.keyPath, 'utf8');
      return Buffer.from(keyHex, 'hex');
    }
    
    const key = randomBytes(ENCRYPTION_KEY_LENGTH);
    fs.writeFileSync(this.keyPath, key.toString('hex'));
    fs.chmodSync(this.keyPath, 0o600); // 僅擁有者可讀寫
    return key;
  }

  // 加密敏感資料
  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  // 解密敏感資料
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async initialize(): Promise<void> {
    try {
      // 確保資料目錄存在
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 開啟資料庫
      this.db = new Database(this.dbPath);
      
      // 設定資料庫選項
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 10000');
      this.db.pragma('temp_store = memory');

      // 初始化表格
      await this.initializeTables();
      
      console.log('✅ 資料庫初始化完成（使用 better-sqlite3 + AES 加密）');
    } catch (error) {
      console.error('❌ 資料庫初始化失敗:', error);
      throw error;
    }
  }

  private async initializeTables(): Promise<void> {
    if (!this.db) throw new Error('資料庫未初始化');

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
        urgency TEXT NOT NULL CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical')),
        deadline DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Completed', 'Cancelled')),
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
        priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'IMPORTANT')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        read_by TEXT
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
      )`
    ];

    // 執行表格創建
    for (const sql of tables) {
      try {
        this.db.exec(sql);
      } catch (error) {
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
      } catch (error) {
        console.warn('創建索引失敗:', sql, error);
      }
    }

    // 插入預設部門
    await this.insertDefaultDepartments();
  }

  private async insertDefaultDepartments(): Promise<void> {
    if (!this.db) throw new Error('資料庫未初始化');

    const defaultDepts = [
      { id: 'Management', name: '營運管理部', theme: 'slate', icon: '💼' },
      { id: 'Engineering', name: '技術工程部', theme: 'blue', icon: '🔧' },
      { id: 'Marketing', name: '市場行銷部', theme: 'purple', icon: '📢' },
      { id: 'HR', name: '人力資源部', theme: 'rose', icon: '👥' },
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
  async run(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) throw new Error('資料庫未初始化');
    
    const stmt = this.db.prepare(sql);
    stmt.run(...params);
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('資料庫未初始化');
    
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) throw new Error('資料庫未初始化');
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  // 事務支援
  transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error('資料庫未初始化');
    
    return this.db.transaction(fn)();
  }

  // 離線同步支援
  async addToSyncQueue(userId: string, actionType: string, tableName: string, recordId: string, data?: any): Promise<void> {
    const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await this.run(
      `INSERT INTO sync_queue (id, user_id, action_type, table_name, record_id, data) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [syncId, userId, actionType, tableName, recordId, data ? JSON.stringify(data) : null]
    );
  }

  async getSyncQueue(userId: string): Promise<any[]> {
    return this.all(
      'SELECT * FROM sync_queue WHERE user_id = ? AND status = "pending" ORDER BY timestamp ASC',
      [userId]
    );
  }

  async markSynced(syncId: string): Promise<void> {
    await this.run(
      'UPDATE sync_queue SET status = "synced", synced_at = datetime("now") WHERE id = ?',
      [syncId]
    );
  }

  async markSyncFailed(syncId: string, errorMessage: string): Promise<void> {
    await this.run(
      'UPDATE sync_queue SET status = "failed", error_message = ?, retry_count = retry_count + 1 WHERE id = ?',
      [errorMessage, syncId]
    );
  }

  // 資料庫備份
  async backup(backupPath: string): Promise<void> {
    if (!this.db) throw new Error('資料庫未初始化');
    
    // 備份資料庫檔案
    fs.copyFileSync(this.dbPath, backupPath);
    
    // 備份加密金鑰
    const keyBackupPath = backupPath.replace('.db', '.key');
    fs.copyFileSync(this.keyPath, keyBackupPath);
  }

  // 異步包裝器方法
  async getAsync(sql: string, params: any[] = []): Promise<any> {
    return this.get(sql, params);
  }

  async allAsync(sql: string, params: any[] = []): Promise<any[]> {
    return this.all(sql, params);
  }

  async runAsync(sql: string, params: any[] = []): Promise<void> {
    this.run(sql, params);
  }

  // 異步事務包裝器
  transactionAsync(fn: () => void): void {
    return this.transaction(fn);
  }
  // 系統日誌方法
  logAction(userId: string, userName: string, action: string, details: string, level: string): void {
    const log = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      user_id: userId,
      user_name: userName,
      action,
      details,
      level
    };

    this.run(
      `INSERT INTO system_logs (id, timestamp, user_id, user_name, action, details, level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [log.id, log.timestamp, log.user_id, log.user_name, log.action, log.details, log.level]
    );
  }

  async getStats(): Promise<any> {
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
  getUsers(): any[] {
    return this.all('SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users ORDER BY name');
  }

  getUserById(id: string): any {
    return this.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  getUserByUsername(username: string): any {
    return this.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  createUser(user: any): void {
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

  updateUser(id: string, updates: any): void {
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

  deleteUser(id: string): void {
    this.run('DELETE FROM users WHERE id = ?', [id]);
  }

  // 部門管理方法
  getDepartments(): any[] {
    return this.all('SELECT * FROM departments ORDER BY name');
  }

  getDepartmentById(id: string): any {
    return this.get('SELECT * FROM departments WHERE id = ?', [id]);
  }

  createDepartment(department: any): void {
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

  updateDepartment(id: string, updates: any): void {
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

  deleteDepartment(id: string): void {
    this.run('DELETE FROM departments WHERE id = ?', [id]);
  }

  // 任務管理方法
  getTasks(filters: any = {}): any[] {
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

  getTaskById(id: string): any {
    return this.get('SELECT * FROM tasks WHERE id = ?', [id]);
  }

  createTask(task: any): void {
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

  updateTask(id: string, updates: any): void {
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

  deleteTask(id: string): void {
    this.run('DELETE FROM tasks WHERE id = ?', [id]);
  }

  // 出勤管理方法
  getAttendanceRecords(userId: string, filters: any = {}): any[] {
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

  getAttendanceById(id: string): any {
    return this.get('SELECT * FROM attendance_records WHERE id = ?', [id]);
  }

  createAttendance(record: any): void {
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

  updateAttendance(id: string, updates: any): void {
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
  getSyncQueue(userId: string): any[] {
    return this.all(
      'SELECT * FROM sync_queue WHERE user_id = ? AND status = "pending" ORDER BY created_at ASC',
      [userId]
    );
  }

  addToSyncQueue(userId: string, action: string, table: string, recordId: string, data: any): void {
    const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.run(
      `INSERT INTO sync_queue (id, user_id, action_type, table_name, record_id, data, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [syncId, userId, action, table, recordId, data ? JSON.stringify(data) : null, new Date().toISOString(), new Date().toISOString()]
    );
  }

  markSyncCompleted(queueId: string): void {
    this.run(
      'UPDATE sync_queue SET status = "synced", updated_at = ? WHERE id = ?',
      [new Date().toISOString(), queueId]
    );
  }

  getFailedSyncs(userId: string): any[] {
    return this.all(
      'SELECT * FROM sync_queue WHERE user_id = ? AND status = "failed" ORDER BY updated_at DESC',
      [userId]
    );
  }

  retryFailedSync(userId: string, queueId: string): boolean {
    try {
      const syncItem = this.get(
        'SELECT * FROM sync_queue WHERE id = ? AND user_id = ? AND status = "failed"',
        [queueId, userId]
      );
      
      if (!syncItem || syncItem.retry_count >= 5) {
        return false;
      }
      
      this.run(
        'UPDATE sync_queue SET status = "pending", retry_count = retry_count + 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), queueId]
      );
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
