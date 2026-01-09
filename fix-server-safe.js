const fs = require('fs');
const path = '/app/dist/server.js';

let content = fs.readFileSync(path, 'utf8');

const chatRouteLine = "this.app.use('/api/chat', chat_1.chatRoutes);";
const insertIndex = content.indexOf(chatRouteLine);

if (insertIndex === -1) {
  console.error('ERROR: Cannot find chat routes line');
  process.exit(1);
}

const endOfLine = content.indexOf('\n', insertIndex);
const before = content.substring(0, endOfLine + 1);
const after = content.substring(endOfLine + 1);

const newRoutes = `        const announcementsRoutes = require('./routes/announcements');
        const versionRoutes = require('./routes/version');
        this.app.use('/api/announcements', announcementsRoutes);
        this.app.use('/api/version', versionRoutes);
`;

const newContent = before + newRoutes + after;

fs.writeFileSync(path, newContent, 'utf8');
console.log('SUCCESS: Routes registered');
