// 使用 better-sqlite3 創建缺失的表格
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join('/app/data', 'taskflow.db');
const db = new Database(dbPath);

const tables = [
    `CREATE TABLE IF NOT EXISTS suggestions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        is_anonymous INTEGER DEFAULT 0,
        author_id TEXT NOT NULL,
        target_dept_id TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        upvotes TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS suggestion_comments (
        id TEXT PRIMARY KEY,
        suggestion_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_official_reply INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'DAILY',
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        content TEXT NOT NULL,
        ai_summary TEXT,
        ai_mood TEXT,
        manager_feedback TEXT,
        reviewed_by TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'NORMAL',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        read_by TEXT DEFAULT '[]'
    )`,
    `CREATE TABLE IF NOT EXISTS memos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'TEXT',
        content TEXT,
        todos TEXT DEFAULT '[]',
        color TEXT NOT NULL DEFAULT 'yellow',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS performance_reviews (
        id TEXT PRIMARY KEY,
        target_user_id TEXT NOT NULL,
        period TEXT NOT NULL,
        reviewer_id TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        task_completion_rate REAL DEFAULT 0,
        sop_completion_rate REAL DEFAULT 0,
        attendance_rate REAL DEFAULT 0,
        rating_work_attitude INTEGER,
        rating_professionalism INTEGER,
        rating_teamwork INTEGER,
        manager_comment TEXT,
        total_score REAL,
        grade TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT'
    )`,
    `CREATE TABLE IF NOT EXISTS chat_channels (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'DIRECT',
        name TEXT,
        participants TEXT NOT NULL DEFAULT '[]',
        last_message_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        avatar TEXT,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_by TEXT DEFAULT '[]'
    )`
];

for (const sql of tables) {
    try {
        db.exec(sql);
        console.log('Created table successfully');
    } catch (err) {
        console.error('Error creating table:', err.message);
    }
}

db.close();
console.log('All tables created!');
