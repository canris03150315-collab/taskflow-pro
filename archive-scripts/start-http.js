const { TaskFlowServer } = require('./dist/server');

// 強制使用 HTTP
const server = new TaskFlowServer({
  port: 3000,
  https: false
});

server.start().then(() => {
  console.log('🚀 HTTP 伺服器已啟動在端口 3000');
}).catch(err => {
  console.error('啟動失敗:', err);
});
