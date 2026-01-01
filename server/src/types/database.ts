// 統一的資料庫介面，支援 Database 和 SecureDatabase
export interface IDatabase {
  // 基本查詢方法
  get(sql: string, params?: any[]): any;
  all(sql: string, params?: any[]): any[];
  run(sql: string, params?: any[]): void;
  
  // 事務處理
  transaction(fn: () => void): void;
  
  // 系統方法
  close(): void;
  backup(backupPath: string): void;
  getStats(): Promise<any>;
  
  // 同步佇列方法
  getSyncQueue(userId: string): any[];
  addToSyncQueue(userId: string, action: string, table: string, recordId: string, data: any): void;
  markSyncCompleted(queueId: string): void;
  getFailedSyncs(userId: string): any[];
  retryFailedSync(userId: string, queueId: string): boolean;
  
  // 用戶管理
  getUsers(): any[];
  getUserById(id: string): any;
  getUserByUsername(username: string): any;
  createUser(user: any): void;
  updateUser(id: string, updates: any): void;
  deleteUser(id: string): void;
  
  // 部門管理
  getDepartments(): any[];
  getDepartmentById(id: string): any;
  createDepartment(department: any): void;
  updateDepartment(id: string, updates: any): void;
  deleteDepartment(id: string): void;
  
  // 任務管理
  getTasks(filters?: any): any[];
  getTaskById(id: string): any;
  createTask(task: any): void;
  updateTask(id: string, updates: any): void;
  deleteTask(id: string): void;
  
  // 出勤管理
  getAttendanceRecords(userId: string, filters?: any): any[];
  getAttendanceById(id: string): any;
  createAttendance(record: any): void;
  updateAttendance(id: string, updates: any): void;
  
  // 系統日誌
  logAction(userId: string, userName: string, action: string, details: string, level: string): void;
}

// 類型守衛函數
export function isSecureDatabase(db: any): db is import('../database-v2').SecureDatabase {
  return db && typeof db.get === 'function' && typeof db.encrypt === 'function';
}

export function isLegacyDatabase(db: any): db is import('../database').Database {
  return db && typeof db.get === 'function' && typeof db.generateEncryptionKey === 'function';
}
