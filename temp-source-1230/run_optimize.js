const { optimizeDatabase } = require('./db_optimize');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

(async () => {
    const db = await open({
        filename: '/app/data/taskflow.db',
        driver: sqlite3.Database
    });
    await optimizeDatabase(db);
    await db.close();
    console.log('資料庫優化完成');
})().catch(console.error);
