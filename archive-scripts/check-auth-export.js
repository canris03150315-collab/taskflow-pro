const auth = require('./dist/routes/auth');
console.log('authRoutes type:', typeof auth.authRoutes);
console.log('authRoutes is Router:', auth.authRoutes && auth.authRoutes.constructor.name);
console.log('All exports:', Object.keys(auth));
