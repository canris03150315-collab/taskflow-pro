const DatabaseV2 = require('./dist/database-v2');
const db = new DatabaseV2.SecureDatabase();

async function run() {
    console.log('--- START ---');
    try {
        await db.initialize();
        const userId = 'user-1767024824151-vbceaduza';
        const records = await db.allAsync("SELECT * FROM attendance_records WHERE user_id = ? ORDER BY clock_in DESC LIMIT 10", [userId]);
        console.log('RECORDS_DATA:' + JSON.stringify(records));
    } catch (e) {
        console.log('ERROR:' + e.message);
    } finally {
        await db.close();
        console.log('--- END ---');
    }
}
run();
