const fs = require('fs');
const path = '/app/dist/server.js';

let content = fs.readFileSync(path, 'utf8');

const insertPosition = content.indexOf("this.app.use('/api/chat', chat_1.chatRoutes);");
if (insertPosition === -1) {
  console.error('Cannot find chat routes line');
  process.exit(1);
}

const linesToAdd = `
        const announcementsRoutes = require('./routes/announcements');
        const versionRoutes = require('./routes/version');
        this.app.use('/api/announcements', announcementsRoutes);
        this.app.use('/api/version', versionRoutes);
`;

const beforeInsert = content.substring(0, insertPosition);
const afterInsert = content.substring(insertPosition);

const newContent = beforeInsert + linesToAdd + '        ' + afterInsert;

fs.writeFileSync(path, newContent, 'utf8');
console.log('SUCCESS: Routes added');
