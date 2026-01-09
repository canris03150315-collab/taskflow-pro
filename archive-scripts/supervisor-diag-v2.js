const DatabaseV2 = require('./dist/database-v2');
const attendance = require('./dist/routes/attendance');
const fs = require('fs');
const db = new DatabaseV2.SecureDatabase();

async function run() {
    const results = { steps: [] };
    const log = (label, data) => results.steps.push({ label, data });

    try {
        await db.initialize();
        const userId = 'user-1767024824151-vbceaduza'; // 測試人員主管
        const user = { id: userId, name: '測試人員主管', role: 'SUPERVISOR' };
        const req = { db, user, query: {}, body: {}, params: {} };
        
        const capture = (label) => ({
            status: (c) => ({ json: (d) => log(label, { status: c, data: d }) }),
            json: (d) => log(label, { status: 200, data: d })
        });

        const handlers = attendance.attendanceRoutes.stack.filter(s => s.route);
        const statusH = handlers.find(s => s.route.path === '/status' && s.route.methods.get).route.stack.slice(-1)[0].handle;
        const inH = handlers.find(s => s.route.path === '/clock-in' && s.route.methods.post).route.stack.slice(-1)[0].handle;
        const outH = handlers.find(s => s.route.path === '/clock-out' && s.route.methods.post).route.stack.slice(-1)[0].handle;

        // Step 1: Check Current Status
        await statusH(req, capture('initial_status'));

        // Step 2: Check Records in DB
        const records = await db.allAsync('SELECT * FROM attendance_records WHERE user_id = ? ORDER BY clock_in DESC LIMIT 5', [userId]);
        log('db_records', records);

        // Step 3: Attempt Clock-In (to see the error)
        await inH(req, capture('clock_in_attempt'));

    } catch (e) {
        results.error = e.message;
        results.stack = e.stack;
    } finally {
        await db.close();
        fs.writeFileSync('/app/supervisor-diag-results.json', JSON.stringify(results, null, 2));
    }
}
run();
