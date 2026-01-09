const fs = require('fs');

console.log('Registering leaves and schedules routes...');

let content = fs.readFileSync('/app/dist/index.js', 'utf8');

if (content.includes('leavesRoutes')) {
    console.log('Already registered!');
    process.exit(0);
}

// Find last route import
const lines = content.split('\n');
let lastImportIdx = -1;
let lastRouteIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("require('./routes/")) {
        lastImportIdx = i;
    }
    if (lines[i].includes("app.use('/api/")) {
        lastRouteIdx = i;
    }
}

if (lastImportIdx > -1) {
    lines.splice(lastImportIdx + 1, 0, "const { leavesRoutes } = require('./routes/leaves');");
    lines.splice(lastImportIdx + 2, 0, "const { schedulesRoutes } = require('./routes/schedules');");
    console.log('Added imports');
}

if (lastRouteIdx > -1) {
    lines.splice(lastRouteIdx + 1, 0, "app.use('/api/leaves', leavesRoutes);");
    lines.splice(lastRouteIdx + 2, 0, "app.use('/api/schedules', schedulesRoutes);");
    console.log('Added routes');
}

fs.writeFileSync('/app/dist/index.js', lines.join('\n'), 'utf8');
console.log('SUCCESS!');
