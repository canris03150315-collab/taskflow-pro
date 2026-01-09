const DatabaseV2 = require('./dist/database-v2');
const attendance = require('./dist/routes/attendance');
const db = new DatabaseV2.SecureDatabase();

async function run() {
    console.log('--- SUPERVISOR DIAGNOSTIC START ---');
    try {
        await db.initialize();
        const userId = 'user-1767024824151-vbceaduza';
        const user = { id: userId, name: '測試人員主管', role: 'SUPERVISOR' };
        
        // 1. Check current status from API
        const req = { db, user, query: {}, body: {}, params: {} };
        const res = {
            status: (c) => ({ json: (d) => console.log('API_STATUS_CODE: ' + c + ' | DATA: ' + JSON.stringify(d)) }),
            json: (d) => console.log('API_DATA: ' + JSON.stringify(d))
        };
        
        const handlers = attendance.attendanceRoutes.stack.filter(s => s.route);
        const statusHandler = handlers.find(s => s.route.path === '/status' && s.route.methods.get).route.stack.slice(-1)[0].handle;
        
        console.log('--- Step 1: API /status result ---');
        await statusHandler(req, res);
        
        // 2. Check DB records
        console.log('--- Step 2: Database records ---');
        const records = await db.allAsync("SELECT * FROM attendance_records WHERE user_id = ? ORDER BY clock_in DESC LIMIT 10", [userId]);
        console.log(JSON.stringify(records, null, 2));
        
        // 3. Check for any open records from any date
        console.log('--- Step 3: All open records ---');
        const openRecords = await db.allAsync("SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL", [userId]);
        console.log(JSON.stringify(openRecords, null, 2));

    } catch (e) {
        console.log('DIAGNOSTIC_ERROR: ' + e.message);
        console.log(e.stack);
    } finally {
        await db.close();
        console.log('--- SUPERVISOR DIAGNOSTIC END ---');
    }
}
run();
