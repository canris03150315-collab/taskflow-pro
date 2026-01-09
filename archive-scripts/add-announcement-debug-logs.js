const fs = require('fs');

console.log('Adding debug logs to announcements routes...\n');

try {
  const filePath = '/app/dist/routes/announcements.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 在 PUT 路由的廣播前添加日誌
  const oldBroadcast = `    if (req.wsServer) {
      req.wsServer.broadcastToAll('ANNOUNCEMENT_UPDATED', {`;
  
  const newBroadcast = `    console.log('[Announcements] Broadcasting ANNOUNCEMENT_UPDATED to all users');
    if (req.wsServer) {
      console.log('[Announcements] wsServer exists, broadcasting...');
      req.wsServer.broadcastToAll('ANNOUNCEMENT_UPDATED', {`;
  
  if (content.includes(oldBroadcast) && !content.includes('[Announcements] Broadcasting')) {
    content = content.replace(oldBroadcast, newBroadcast);
    console.log('✅ Added debug logs to PUT route');
  } else if (content.includes('[Announcements] Broadcasting')) {
    console.log('ℹ️  Debug logs already exist');
  } else {
    console.log('⚠️  Could not find broadcast code');
  }
  
  // 在 POST 路由也添加日誌
  const oldPostBroadcast = `    if (req.wsServer) {
      req.wsServer.broadcastToAll('ANNOUNCEMENT_CREATED', {`;
  
  const newPostBroadcast = `    console.log('[Announcements] Broadcasting ANNOUNCEMENT_CREATED to all users');
    if (req.wsServer) {
      console.log('[Announcements] wsServer exists, broadcasting...');
      req.wsServer.broadcastToAll('ANNOUNCEMENT_CREATED', {`;
  
  if (content.includes(oldPostBroadcast) && !content.includes('[Announcements] Broadcasting ANNOUNCEMENT_CREATED')) {
    content = content.replace(oldPostBroadcast, newPostBroadcast);
    console.log('✅ Added debug logs to POST route');
  }
  
  // 寫回文件
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\n✅ Debug logs added successfully');
  console.log('📝 Now you can check docker logs to see if broadcast is being sent');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
