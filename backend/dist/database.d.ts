export declare class Database {
    private db;
    private dbPath;
    private encryptionKey;
    constructor(dbPath?: string, encryptionKey?: string);
    private generateEncryptionKey;
    initialize(): Promise<void>;
    private initializeTables;
    private insertDefaultDepartments;
    private validateSchema;
    run(sql: string, params?: any[]): Promise<void>;
    get(sql: string, params?: any[]): Promise<any>;
    all(sql: string, params?: any[]): Promise<any[]>;
    close(): Promise<void>;
    backup(backupPath: string): Promise<void>;
    getStats(): Promise<any>;
}
