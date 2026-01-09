const DatabaseV2 = require('./dist/database-v2');
const db = new DatabaseV2.SecureDatabase();

async function run() {
    try {
        await db.initialize();
        const userId = 'user-1767024824151-vbceaduza';
        
        // Find all open records for this user
        const openRecords = await db.allAsync("SELECT id, clock_in, date FROM attendance_records WHERE user_id = ? AND clock_out IS NULL", [userId]);
        
        let report = 'Found ' + openRecords.length + ' open records for Supervisor.\n';
        
        if (openRecords.length > 0) {
            for (const record of openRecords) {
                const clockIn = new Date(record.clock_in);
                const clockOut = new Date(clockIn.getTime() + 8 * 60 * 60 * 1000);
                await db.runAsync(
                    "UPDATE attendance_records SET clock_out = ?, duration_minutes = 480, status = 'OFFLINE' WHERE id = ?",
                    [clockOut.toISOString(), record.id]
                );
                report += 'Closed record: ' + record.id + ' (date: ' + record.date + ')\n';
            }
        }
        
        // Also check if there's any record for "today" (Taiwan) that might be blocking
        const now = new Date();
        const twToday = new Date(now.getTime() + (8 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const todayRecord = await db.getAsync("SELECT id, status, clock_out FROM attendance_records WHERE user_id = ? AND date = ? ORDER BY clock_in DESC LIMIT 1", [userId, twToday]);
        
        if (todayRecord) {
            report += 'Today record found: ' + todayRecord.id + ' status: ' + todayRecord.status + ' clock_out: ' + todayRecord.clock_out + '\n';
        } else {
            report += 'No record found for today (' + twToday + ').\n';
        }

        require('fs').writeFileSync('/tmp/unstick_supervisor_report.txt', report);
    } catch (e) {
        require('fs').writeFileSync('/tmp/unstick_supervisor_error.txt', e.message + '\n' + e.stack);
    } finally {
        await db.close();
    }
}
run();
