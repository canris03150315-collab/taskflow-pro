try {
    console.log('Testing auth.js syntax...');
    const auth = require('./dist/routes/auth');
    console.log('SUCCESS: auth.js syntax is OK');
    console.log('authRoutes type:', typeof auth.authRoutes);
} catch (error) {
    console.error('ERROR: auth.js has syntax error');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
