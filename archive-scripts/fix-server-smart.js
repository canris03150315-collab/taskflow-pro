const fs = require('fs');
const path = '/app/dist/server.js';

let content = fs.readFileSync(path, 'utf8');

// 1. 檢查並添加 announcements 和 version 的導入（如果不存在）
if (!content.includes('const announcements_1 = require("./routes/announcements")')) {
  const chatImport = 'const chat_1 = require("./routes/chat");';
  const chatImportIndex = content.indexOf(chatImport);
  if (chatImportIndex === -1) {
    console.error('ERROR: Cannot find chat import');
    process.exit(1);
  }
  
  const endOfChatImport = content.indexOf('\n', chatImportIndex);
  const beforeImports = content.substring(0, endOfChatImport + 1);
  const afterImports = content.substring(endOfChatImport + 1);
  
  const newImports = `const announcements_1 = require("./routes/announcements");
const version_1 = require("./routes/version");
`;
  
  content = beforeImports + newImports + afterImports;
  console.log('Added imports for announcements and version');
} else {
  console.log('Imports already exist, skipping');
}

// 2. 取消註釋或添加 announcements 路由
if (content.includes("// this.app.use('/api/announcements', announcementRoutes);")) {
  content = content.replace(
    "// this.app.use('/api/announcements', announcementRoutes);",
    "this.app.use('/api/announcements', announcements_1.announcementsRoutes);"
  );
  console.log('Uncommented announcements route');
} else if (!content.includes("this.app.use('/api/announcements'")) {
  const chatRoute = "this.app.use('/api/chat', chat_1.chatRoutes);";
  const chatRouteIndex = content.indexOf(chatRoute);
  if (chatRouteIndex === -1) {
    console.error('ERROR: Cannot find chat route registration');
    process.exit(1);
  }
  
  const endOfChatRoute = content.indexOf('\n', chatRouteIndex);
  const beforeRoutes = content.substring(0, endOfChatRoute + 1);
  const afterRoutes = content.substring(endOfChatRoute + 1);
  
  const announcementsRoute = "        this.app.use('/api/announcements', announcements_1.announcementsRoutes);\n";
  content = beforeRoutes + announcementsRoute + afterRoutes;
  console.log('Added announcements route');
} else {
  console.log('Announcements route already exists');
}

// 3. 添加 version 路由（如果不存在）
if (!content.includes("this.app.use('/api/version'")) {
  const chatRoute = "this.app.use('/api/chat', chat_1.chatRoutes);";
  const chatRouteIndex = content.indexOf(chatRoute);
  if (chatRouteIndex === -1) {
    console.error('ERROR: Cannot find chat route registration');
    process.exit(1);
  }
  
  const endOfChatRoute = content.indexOf('\n', chatRouteIndex);
  const beforeRoutes = content.substring(0, endOfChatRoute + 1);
  const afterRoutes = content.substring(endOfChatRoute + 1);
  
  const versionRoute = "        this.app.use('/api/version', version_1.versionRoutes);\n";
  content = beforeRoutes + versionRoute + afterRoutes;
  console.log('Added version route');
} else {
  console.log('Version route already exists');
}

fs.writeFileSync(path, content, 'utf8');
console.log('SUCCESS: All routes fixed');
