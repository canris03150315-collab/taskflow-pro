const fs = require('fs');
const path = '/app/dist/server.js';

let content = fs.readFileSync(path, 'utf8');

// 找到導入區域的結束位置（在 const router = express_1.default.Router() 之前）
const importSectionEnd = content.indexOf('const auth_1 = require("../middleware/auth");');
if (importSectionEnd === -1) {
  console.error('ERROR: Cannot find auth import');
  process.exit(1);
}

// 在導入區域添加新的路由導入
const endOfAuthImport = content.indexOf('\n', importSectionEnd);
const beforeImports = content.substring(0, endOfAuthImport + 1);
const afterImports = content.substring(endOfAuthImport + 1);

const newImports = `const announcements_1 = require("./routes/announcements");
const version_1 = require("./routes/version");
`;

const contentWithImports = beforeImports + newImports + afterImports;

// 找到路由註冊區域（在 chat 路由之後）
const chatRouteLine = "this.app.use('/api/chat', chat_1.chatRoutes);";
const routeIndex = contentWithImports.indexOf(chatRouteLine);
if (routeIndex === -1) {
  console.error('ERROR: Cannot find chat route');
  process.exit(1);
}

const endOfChatRoute = contentWithImports.indexOf('\n', routeIndex);
const beforeRoutes = contentWithImports.substring(0, endOfChatRoute + 1);
const afterRoutes = contentWithImports.substring(endOfChatRoute + 1);

const newRoutes = `        this.app.use('/api/announcements', announcements_1.announcementsRoutes);
        this.app.use('/api/version', version_1.versionRoutes);
`;

const finalContent = beforeRoutes + newRoutes + afterRoutes;

fs.writeFileSync(path, finalContent, 'utf8');
console.log('SUCCESS: Routes imported and registered');
