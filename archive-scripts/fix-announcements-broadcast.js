const fs = require('fs');

console.log('Adding WebSocket broadcast to announcements routes...\n');

try {
  const filePath = '/app/dist/routes/announcements.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. 修復 POST 路由：在 res.json 之前添加廣播
  const oldPost = `    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    res.json(parseAnnouncementJson(announcement));`;
  
  const newPost = `    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    
    // Broadcast to all users
    if (req.wsServer) {
      req.wsServer.broadcastToAll('ANNOUNCEMENT_CREATED', {
        announcement: parseAnnouncementJson(announcement),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(parseAnnouncementJson(announcement));`;
  
  if (content.includes(oldPost)) {
    content = content.replace(oldPost, newPost);
    console.log('✅ Step 1: Added broadcast to POST route (ANNOUNCEMENT_CREATED)');
  } else {
    console.log('⚠️  Step 1: POST route already has broadcast or format changed');
  }
  
  // 2. 修復 PUT 路由：在 res.json 之前添加廣播
  const oldPut = `    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    res.json(parseAnnouncementJson(announcement));
  } catch (error) {
    console.error('Update announcement error:', error);`;
  
  const newPut = `    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    
    // Broadcast to all users
    if (req.wsServer) {
      req.wsServer.broadcastToAll('ANNOUNCEMENT_UPDATED', {
        announcement: parseAnnouncementJson(announcement),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(parseAnnouncementJson(announcement));
  } catch (error) {
    console.error('Update announcement error:', error);`;
  
  if (content.includes(oldPut)) {
    content = content.replace(oldPut, newPut);
    console.log('✅ Step 2: Added broadcast to PUT route (ANNOUNCEMENT_UPDATED)');
  } else {
    console.log('⚠️  Step 2: PUT route already has broadcast or format changed');
  }
  
  // 寫回文件
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\n✅ WebSocket broadcast added to announcements routes');
  console.log('📝 Changes:');
  console.log('   - POST route now broadcasts ANNOUNCEMENT_CREATED');
  console.log('   - PUT route now broadcasts ANNOUNCEMENT_UPDATED');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
