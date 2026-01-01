// 聊天檔案清理腳本 - 刪除超過兩個月的圖片和檔案訊息
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || '/app/data/taskflow.db';
const db = new Database(dbPath);

// 計算兩個月前的日期
const twoMonthsAgo = new Date();
twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
const cutoffDate = twoMonthsAgo.toISOString();

console.log('=== 聊天檔案清理腳本 ===');
console.log('清理日期門檻:', cutoffDate);

try {
    // 統計將要刪除的訊息
    const imgCount = db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages 
        WHERE content LIKE '[IMG]%' AND timestamp < ?
    `).get(cutoffDate);
    
    const fileCount = db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages 
        WHERE content LIKE '[FILE]%' AND timestamp < ?
    `).get(cutoffDate);
    
    console.log('將刪除的圖片訊息:', imgCount.count);
    console.log('將刪除的檔案訊息:', fileCount.count);
    
    // 刪除超過兩個月的圖片訊息
    const deleteImg = db.prepare(`
        DELETE FROM chat_messages 
        WHERE content LIKE '[IMG]%' AND timestamp < ?
    `).run(cutoffDate);
    
    // 刪除超過兩個月的檔案訊息
    const deleteFile = db.prepare(`
        DELETE FROM chat_messages 
        WHERE content LIKE '[FILE]%' AND timestamp < ?
    `).run(cutoffDate);
    
    console.log('已刪除圖片訊息:', deleteImg.changes);
    console.log('已刪除檔案訊息:', deleteFile.changes);
    
    // 統計剩餘訊息
    const remainImg = db.prepare(`SELECT COUNT(*) as count FROM chat_messages WHERE content LIKE '[IMG]%'`).get();
    const remainFile = db.prepare(`SELECT COUNT(*) as count FROM chat_messages WHERE content LIKE '[FILE]%'`).get();
    
    console.log('剩餘圖片訊息:', remainImg.count);
    console.log('剩餘檔案訊息:', remainFile.count);
    
    // 清理資料庫碎片
    db.exec('VACUUM');
    console.log('資料庫碎片清理完成');
    
} catch (error) {
    console.error('清理錯誤:', error.message);
} finally {
    db.close();
}

console.log('=== 清理完成 ===');
