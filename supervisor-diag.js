
const DatabaseV2 = require('./dist/database-v2');
const attendance = require('./dist/routes/attendance');
const db = new DatabaseV2.SecureDatabase();

async function run() {
    console.log('--- SUPERVISOR DIAGNOSTIC START ---');
    try {
        await db.initialize();
        const userId = 'user-1767024824151-vbceaduza'; // 測試人員主管
        const user = { id: userId, name: '測試人員主管', role: 'SUPERVISOR' };
        
        const mockRes = (label) => ({
            status: (c) => ({ json: (d) => console.log(label + ' [' + c + ']: ' + JSON.stringify(d)) }),
            json: (d) => console.log(label + ' [200]: ' + JSON.stringify(d))
        });

        const req = { db, user, query: {}, body: {}, params: {} };
        const handlers = attendance.attendanceRoutes.stack.filter(s => s.route);
        
        const statusH = handlers.find(s => s.route.path === '/status' && s.route.methods.get).route.stack.slice(-1)[0].handle;
        const outH = handlers.find(s => s.route.path === '/clock-out' && s.route.methods.post).route.stack.slice(-1)[0].handle;
        const inH = handlers.find(s => s.route.path === '/clock-in' && s.route.methods.post).route.stack.slice(-1)[0].handle;

        console.log('1. Checking current status for Supervisor...');
        await statusH(req, mockRes('STATUS_CHECK'));

        console.log('2. Attempting Clock-Out for Supervisor (to clear legacy session)...');
        await outH(req, mockRes('CLOCK_OUT_ATTEMPT'));

        console.log('3. Checking status after clock-out...');
        await statusH(req, mockRes('AFTER_OUT_STATUS'));

        console.log('4. Attempting new Clock-In for Supervisor...');
        await inH(req, mockRes('CLOCK_IN_ATTEMPT'));

        console.log('5. Final status check...');
        await statusH(req, mockRes('FINAL_STATUS'));

    } catch (e) {
        console.log('SIM_ERROR: ' + e.message);
        console.log(e.stack);
    } finally {
        await db.close();
        console.log('--- SUPERVISOR DIAGNOSTIC END ---');
    }
}
run();
