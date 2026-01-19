try {
    require('/app/dist/routes/reports.js');
    console.log('✅ reports.js syntax is OK');
} catch (error) {
    console.log('❌ Syntax error:', error.message);
    process.exit(1);
}
