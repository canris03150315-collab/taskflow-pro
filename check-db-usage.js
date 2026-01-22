const fs = require('fs');

// Check how other routes use database
const files = [
    '/app/dist/routes/reports.js',
    '/app/dist/routes/routines.js',
    '/app/dist/routes/attendance.js'
];

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        console.log(`\n=== ${file} ===`);
        
        // Look for database query patterns
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (line.includes('req.db.') || line.includes('db.get(') || line.includes('db.all(')) {
                console.log(`Line ${idx + 1}: ${line.trim()}`);
            }
        });
    } catch (error) {
        console.log(`Cannot read ${file}: ${error.message}`);
    }
});
