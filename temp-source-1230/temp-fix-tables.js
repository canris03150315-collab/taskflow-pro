const Database = require("better-sqlite3");
const db = new Database("/app/data/taskflow.db");

const tables = [
    `CREATE TABLE IF NOT EXISTS finance_records (
        id TEXT PRIMARY KEY,
        type TEXT,
        amount REAL,
        description TEXT,
        category TEXT,
        attachments TEXT,
        user_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS routine_templates (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        frequency TEXT,
        department_id TEXT,
        created_by TEXT,
        created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS routine_records (
        id TEXT PRIMARY KEY,
        template_id TEXT,
        user_id TEXT,
        department_id TEXT,
        date TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS chat_channels (
        id TEXT PRIMARY KEY,
        type TEXT,
        name TEXT,
        participants TEXT,
        created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        channel_id TEXT,
        user_id TEXT,
        user_name TEXT,
        avatar TEXT,
        content TEXT,
        timestamp TEXT,
        read_by TEXT
    )`
];

tables.forEach(sql => {
    try {
        db.exec(sql);
        console.log("表格創建/確認成功");
    } catch (e) {
        console.error("表格創建錯誤:", e.message);
    }
});

db.close();
console.log("資料庫表格修復完成");
