
const DatabaseV2 = require('./dist/database-v2');
const path = require('path');

async function check() {
    const db = new DatabaseV2.SecureDatabase();
    try {
        await db.initialize();
        console.log('--- Attendance DB Inspection ---');
        
        // 1. Check Table Schema
        const schema = await db.allAsync("PRAGMA table_info(attendance_records)");
        console.log('SCHEMA_START');
        console.log(JSON.stringify(schema, null, 2));
        console.log('SCHEMA_END');
        
        // 2. Check Recent Records
        const recent = await db.allAsync("SELECT * FROM attendance_records ORDER BY clock_in DESC LIMIT 10");
        console.log('RECENT_START');
        console.log(JSON.stringify(recent, null, 2));
        console.log('RECENT_END');
        
        // 3. Check for any "Open" sessions (clock_out IS NULL)
        const openSessions = await db.allAsync("SELECT * FROM attendance_records WHERE clock_out IS NULL");
        console.log('OPEN_SESSIONS_START');
        console.log(JSON.stringify(openSessions, null, 2));
        console.log('OPEN_SESSIONS_END');
        
        // 4. Check for today's records specifically
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = await db.allAsync("SELECT * FROM attendance_records WHERE date = ?", [today]);
        console.log('TODAY_RECORDS_START');
        console.log(JSON.stringify(todayRecords, null, 2));
        console.log('TODAY_RECORDS_END');

    } catch (e) {
        console.error('DB CHECK ERROR:', e.message);
        console.error(e.stack);
    } finally {
        try { await db.close(); } catch(err) {}
    }
}
check();
