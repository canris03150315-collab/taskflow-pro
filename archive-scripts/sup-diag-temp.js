const DatabaseV2 = require('./dist/database-v2');
const db = new DatabaseV2.SecureDatabase();

async function run() {
    try {
        await db.initialize();
        const userId = 'user-1767024824151-vbceaduza';
        const records = await db.allAsync("SELECT id, date, clock_in, clock_out, status FROM attendance_records WHERE user_id = ? ORDER BY clock_in DESC LIMIT 10", [userId]);
        console.log('---RECORDS_START---');
        console.log(JSON.stringify(records));
        console.log('---RECORDS_END---');
    } catch (e) {
        console.log('---ERROR_START---');
        console.log(e.message);
        console.log('---ERROR_END---');
    } finally {
        await db.close();
    }
}
run();
