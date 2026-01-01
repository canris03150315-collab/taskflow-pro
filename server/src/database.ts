import sqlite3 from 'sqlcipher';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { User, Task, DepartmentDef, Announcement, Report, FinanceRecord, Suggestion, Memo, RoutineTemplate, AttendanceRecord, PerformanceReview, SystemLog, ChatChannel, ChatMessage } from '../types';

export class Database {
  private db: sqlite3.Database | null = null;
  private dbPath: string;
  private encryptionKey: string;

  constructor(dbPath: string = './data/taskflow.db', encryptionKey?: string) {
    this.dbPath = path.resolve(dbPath);
    this.encryptionKey = encryptionKey || this.generateEncryptionKey();
  }

  private generateEncryptionKey(): string {
    const keyFile = path.join(path.dirname(this.dbPath), '.db-key');
    if (fs.existsSync(keyFile)) {
      return fs.readFileSync(keyFile, 'utf8');
    }
    
    const key = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(keyFile, key);
    fs.chmodSync(keyFile, 0o600); // 僅擁有者可讀寫
    return key;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 確保資料目錄存在
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // 設定加密密鑰
        this.db!.run(`PRAGMA key = '${this.encryptionKey}'`, (err) => {
          if (err) {
            reject(new Error('資料庫加密失敗：密鑰可能不正確'));
            return;
          }

          // 測試資料庫是否可讀
          this.db!.run('SELECT count(*) FROM sqlite_master', (err) => {
            if (err) {
              // 可能是新資料庫，需要初始化
              this.initializeTables()
                .then(() => resolve())
                .catch(reject);
            } else {
              // 現有資料庫，驗證結構
              this.validateSchema()
                .then(() => resolve())
                .catch(reject);
            }
          });
        });
      });
    });
  }

  private async initializeTables(): Promise<void> {
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
        permissions TEXT, -- JSON array
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

      // 任務表
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        urgency TEXT NOT NULL CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical')),
        deadline DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Completed')),
        target_department TEXT,
        assigned_to_user_id TEXT,
        accepted_by_user_id TEXT,
        completion_notes TEXT,
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        created_by TEXT NOT NULL,
        is_archived BOOLEAN DEFAULT FALSE
      )`,

      // 任務時間軸表
      `CREATE TABLE IF NOT EXISTS task_timeline (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        progress INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )`,

      // 公告表
      `CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'IMPORTANT')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        read_by TEXT -- JSON array of user IDs
      )`,

      // 報表表
      `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'DAILY',
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        content TEXT NOT NULL, -- JSON of DailyReportContent
        ai_summary TEXT,
        ai_mood TEXT CHECK (ai_mood IN ('POSITIVE', 'NEUTRAL', 'STRESSED')),
        manager_feedback TEXT,
        reviewed_by TEXT
      )`,

      // 財務記錄表
      `CREATE TABLE IF NOT EXISTS finance_records (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        scope TEXT NOT NULL CHECK (scope IN ('DEPARTMENT', 'PERSONAL')),
        department_id TEXT NOT NULL,
        owner_id TEXT,
        recorded_by TEXT NOT NULL,
        attachment TEXT -- Base64 or file path
      )`,

      // 提案表
      `CREATE TABLE IF NOT EXISTS suggestions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT FALSE,
        author_id TEXT NOT NULL,
        target_dept_id TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWING', 'APPROVED', 'REJECTED')),
        upvotes TEXT, -- JSON array of user IDs
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // 提案評論表
      `CREATE TABLE IF NOT EXISTS suggestion_comments (
        id TEXT PRIMARY KEY,
        suggestion_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_official_reply BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE CASCADE
      )`,

      // 備忘錄表
      `CREATE TABLE IF NOT EXISTS memos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('TEXT', 'CHECKLIST')),
        content TEXT,
        todos TEXT, -- JSON array of MemoTodo
        color TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'rose', 'purple')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // SOP 模板表
      `CREATE TABLE IF NOT EXISTS routine_templates (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL,
        title TEXT NOT NULL,
        items TEXT NOT NULL, -- JSON array
        last_updated DATE NOT NULL,
        read_by TEXT -- JSON array of user IDs
      )`,

      // SOP 執行記錄表
      `CREATE TABLE IF NOT EXISTS routine_records (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        date DATE NOT NULL,
        items TEXT NOT NULL, -- JSON array of RoutineItemStatus
        completed_at DATETIME,
        FOREIGN KEY (template_id) REFERENCES routine_templates(id) ON DELETE CASCADE
      )`,

      // 出勤記錄表
      `CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date DATE NOT NULL,
        clock_in DATETIME NOT NULL,
        clock_out DATETIME,
        duration_minutes INTEGER,
        status TEXT NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE'))
      )`,

      // 績效評核表
      `CREATE TABLE IF NOT EXISTS performance_reviews (
        id TEXT PRIMARY KEY,
        target_user_id TEXT NOT NULL,
        period TEXT NOT NULL, -- YYYY-MM
        reviewer_id TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        task_completion_rate DECIMAL(5,2) DEFAULT 0 CHECK (task_completion_rate >= 0 AND task_completion_rate <= 100),
        sop_completion_rate DECIMAL(5,2) DEFAULT 0 CHECK (sop_completion_rate >= 0 AND sop_completion_rate <= 100),
        attendance_rate DECIMAL(5,2) DEFAULT 0 CHECK (attendance_rate >= 0 AND attendance_rate <= 100),
        rating_work_attitude INTEGER CHECK (rating_work_attitude >= 1 AND rating_work_attitude <= 5),
        rating_professionalism INTEGER CHECK (rating_professionalism >= 1 AND rating_professionalism <= 5),
        rating_teamwork INTEGER CHECK (rating_teamwork >= 1 AND rating_teamwork <= 5),
        manager_comment TEXT,
        total_score DECIMAL(5,2) CHECK (total_score >= 0 AND total_score <= 100),
        grade TEXT CHECK (grade IN ('S', 'A', 'B', 'C', 'D')),
        status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED'))
      )`,

      // 系統日誌表
      `CREATE TABLE IF NOT EXISTS system_logs (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'INFO' CHECK (level IN ('INFO', 'WARNING', 'DANGER'))
      )`,

      // 聊天頻道表
      `CREATE TABLE IF NOT EXISTS chat_channels (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('DIRECT', 'GROUP', 'DEPARTMENT')),
        name TEXT,
        participants TEXT NOT NULL, -- JSON array of user IDs
        last_message_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // 聊天訊息表
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        avatar TEXT,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_by TEXT, -- JSON array of user IDs
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    // 創建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_messages_channel ON chat_messages(channel_id)',
      'CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp)'
    ];

    for (const sql of indexes) {
      await this.run(sql);
    }

    // 插入預設部門
    await this.insertDefaultDepartments();
  }

  private async insertDefaultDepartments(): Promise<void> {
    const defaultDepts = [
      { id: 'Management', name: '營運管理部', theme: 'slate', icon: '💼' },
      { id: 'Engineering', name: '技術工程部', theme: 'blue', icon: '🔧' },
      { id: 'Marketing', name: '市場行銷部', theme: 'purple', icon: '📢' },
      { id: 'HR', name: '人力資源部', theme: 'rose', icon: '👥' },
      { id: 'UNASSIGNED', name: '待分配 / 新人', theme: 'slate', icon: '🔰' }
    ];

    for (const dept of defaultDepts) {
      await this.run(
        'INSERT OR IGNORE INTO departments (id, name, theme, icon) VALUES (?, ?, ?, ?)',
        [dept.id, dept.name, dept.theme, dept.icon]
      );
    }
  }

  private async validateSchema(): Promise<void> {
    // 檢查關鍵表是否存在
    const requiredTables = [
      'users', 'departments', 'tasks', 'announcements', 
      'finance_records', 'attendance_records', 'system_logs'
    ];

    for (const table of requiredTables) {
      const result = await this.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table]
      );
      
      if (!result) {
        throw new Error(`資料庫缺少必要表格: ${table}`);
      }
    }
  }

  // 基礎資料庫操作方法
  async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // 資料庫備份
  async backup(backupPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.backup(backupPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // 獲取資料庫統計資訊
  async getStats(): Promise<any> {
    const stats = await Promise.all([
      this.get('SELECT COUNT(*) as count FROM users'),
      this.get('SELECT COUNT(*) as count FROM tasks'),
      this.get('SELECT COUNT(*) as count FROM attendance_records'),
      this.get('SELECT COUNT(*) as count FROM finance_records')
    ]);

    return {
      users: stats[0].count,
      tasks: stats[1].count,
      attendance: stats[2].count,
      finance: stats[3].count,
      dbSize: fs.statSync(this.dbPath).size
    };
  }
}
