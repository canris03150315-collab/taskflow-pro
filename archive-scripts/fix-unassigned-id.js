const fs = require('fs');

console.log('Fixing dept-unassigned to UNASSIGNED...');

// Fix users.js
const usersPath = '/app/dist/routes/users.js';
let usersContent = fs.readFileSync(usersPath, 'utf8');
const usersOldCount = (usersContent.match(/dept-unassigned/g) || []).length;
usersContent = usersContent.replace(/dept-unassigned/g, 'UNASSIGNED');
fs.writeFileSync(usersPath, usersContent, 'utf8');
console.log('users.js: Replaced', usersOldCount, 'occurrences of dept-unassigned with UNASSIGNED');

// Fix auth.js
const authPath = '/app/dist/middleware/auth.js';
let authContent = fs.readFileSync(authPath, 'utf8');
const authOldCount = (authContent.match(/dept-unassigned/g) || []).length;
authContent = authContent.replace(/dept-unassigned/g, 'UNASSIGNED');
fs.writeFileSync(authPath, authContent, 'utf8');
console.log('auth.js: Replaced', authOldCount, 'occurrences of dept-unassigned with UNASSIGNED');

console.log('Complete!');
