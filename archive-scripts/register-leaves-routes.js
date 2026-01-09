const fs = require('fs');

console.log('Registering leaves and schedules routes in index.js...\n');

let content = fs.readFileSync('/app/dist/index.js', 'utf8');

// Check if routes are already registered
if (content.includes('leavesRoutes') || content.includes('schedulesRoutes')) {
    console.log('Routes already registered!');
    process.exit(0);
}

// Find the imports section and add leaves/schedules imports
const importPattern = /(const { workLogRoutes } = require\('\.\/routes\/work-logs'\);)/;
if (content.match(importPattern)) {
    content = content.replace(
        importPattern,
        `$1
const { leavesRoutes } = require('./routes/leaves');
const { schedulesRoutes } = require('./routes/schedules');`
    );
    console.log('✓ Added imports for leaves and schedules routes');
}

// Find where routes are registered and add leaves/schedules
const routePattern = /(app\.use\('\/api\/work-logs', workLogRoutes\);)/;
if (content.match(routePattern)) {
    content = content.replace(
        routePattern,
        `$1
        app.use('/api/leaves', leavesRoutes);
        app.use('/api/schedules', schedulesRoutes);`
    );
    console.log('✓ Registered /api/leaves and /api/schedules routes');
}

fs.writeFileSync('/app/dist/index.js', content, 'utf8');

console.log('\n✅ SUCCESS: Leaves and schedules routes registered!');
