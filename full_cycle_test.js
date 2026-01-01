const DatabaseV2 = require('./dist/database-v2');
const attendance = require('./dist/routes/attendance');
const db = new DatabaseV2.SecureDatabase();

async function run() {
    console.log('--- FULL CYCLE VERIFICATION ---');
    try {
        await db.initialize();
        const userId = 'user-1767024824151-vbceaduza'; // Supervisor
        const user = { id: userId, name: '測試人員主管', role: 'SUPERVISOR' };
        
        const mockRes = (label) => ({
            status: (code) => ({
                json: (data) => console.log(`[${label}] STATUS: ${code} | DATA: ${JSON.stringify(data)}`)
            }),
            json: (data) => console.log(`[${label}] STATUS: 200 | DATA: ${JSON.stringify(data)}`)
        });

        const req = { 
            db, 
            user, 
            body: { 
                location_lat: 25.0330, 
                location_lng: 121.5654, 
                location_address: 'Verification Test',
                client_timestamp: new Date().toISOString()
            }, 
            query: {}, 
            params: {} 
        };

        const handlers = attendance.attendanceRoutes.stack.filter(s => s.route);
        const statusH = handlers.find(s => s.route.path === '/status' && s.route.methods.get).route.stack.slice(-1)[0].handle;
        const inH = handlers.find(s => s.route.path === '/clock-in' && s.route.methods.post).route.stack.slice(-1)[0].handle;
        const outH = handlers.find(s => s.route.path === '/clock-out' && s.route.methods.post).route.stack.slice(-1)[0].handle;

        // 1. Initial Status
        console.log('\n1. Checking Initial Status (Expect: CLOCKED_OUT)');
        await statusH(req, mockRes('STATUS_1'));

        // 2. Clock In
        console.log('\n2. Attempting Clock In (Expect: Success)');
        await inH(req, mockRes('CLOCK_IN'));

        // 3. Status After In
        console.log('\n3. Checking Status After In (Expect: CLOCKED_IN)');
        await statusH(req, mockRes('STATUS_2'));

        // 4. Clock Out
        console.log('\n4. Attempting Clock Out (Expect: Success)');
        await outH(req, mockRes('CLOCK_OUT'));

        // 5. Final Status
        console.log('\n5. Checking Final Status (Expect: CLOCKED_OUT)');
        await statusH(req, mockRes('STATUS_3'));

    } catch (e) {
        console.error('SIM ERROR:', e.message);
        console.error(e.stack);
    } finally {
        await db.close();
        console.log('\n--- VERIFICATION COMPLETE ---');
    }
}
run();
