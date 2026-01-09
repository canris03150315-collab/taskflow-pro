const DatabaseV2 = require('./dist/database-v2');
const attendance = require('./dist/routes/attendance');
const db = new DatabaseV2.SecureDatabase();

async function run() {
    try {
        await db.initialize();
        const userId = 'user-1767024824151-vbceaduza'; // 測試人員主管
        const user = { id: userId, name: '測試人員主管', role: 'SUPERVISOR' };
        
        const mockRes = {
            status: (c) => ({ json: (d) => { console.log('STATUS_CODE:' + c); console.log('DATA_JSON:' + JSON.stringify(d)); } }),
            json: (d) => { console.log('STATUS_CODE:200'); console.log('DATA_JSON:' + JSON.stringify(d)); }
        };

        const req = { db, user, query: {}, body: {}, params: {} };
        const handlers = attendance.attendanceRoutes.stack.filter(s => s.route);
        const statusH = handlers.find(s => s.route.path === '/status' && s.route.methods.get).route.stack.slice(-1)[0].handle;
        
        await statusH(req, mockRes);
        
        const openRecords = await db.allAsync("SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL", [userId]);
        console.log('OPEN_RECORDS:' + JSON.stringify(openRecords));

    } catch (e) {
        console.log('ERROR:' + e.message);
    } finally {
        await db.close();
    }
}
run();
