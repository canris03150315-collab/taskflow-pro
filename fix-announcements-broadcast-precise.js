const fs = require('fs');

console.log('Adding WebSocket broadcast to announcements routes...\n');

try {
  const filePath = '/app/dist/routes/announcements.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. 修復 POST 路由
  const postPattern = /const announcement = dbCall\(db, 'prepare', 'SELECT \* FROM announcements WHERE id = \?'\)\.get\(id\);\s+res\.json\(parseAnnouncementJson\(announcement\)\);/;
  
  const postReplacement = `const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    
    if (req.wsServer) {
      req.wsServer.broadcastToAll('ANNOUNCEMENT_CREATED', {
        announcement: parseAnnouncementJson(announcement),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(parseAnnouncementJson(announcement));`;
  
  const postMatch = content.match(postPattern);
  if (postMatch && !content.includes('ANNOUNCEMENT_CREATED')) {
    content = content.replace(postPattern, postReplacement);
    console.log('✅ Added broadcast to POST route (ANNOUNCEMENT_CREATED)');
  } else if (content.includes('ANNOUNCEMENT_CREATED')) {
    console.log('ℹ️  POST route already has ANNOUNCEMENT_CREATED broadcast');
  } else {
    console.log('⚠️  Could not find POST route pattern');
  }
  
  // 2. 修復 PUT 路由 - 使用不同的模式來區分
  const lines = content.split('\n');
  let inPutRoute = false;
  let putRouteFixed = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("router.put('/:id'")) {
      inPutRoute = true;
    }
    
    if (inPutRoute && lines[i].includes('res.json(parseAnnouncementJson(announcement))') && !content.includes('ANNOUNCEMENT_UPDATED')) {
      // 在這一行之前插入廣播代碼
      const indent = '    ';
      const broadcastCode = [
        '',
        indent + 'if (req.wsServer) {',
        indent + "  req.wsServer.broadcastToAll('ANNOUNCEMENT_UPDATED', {",
        indent + '    announcement: parseAnnouncementJson(announcement),',
        indent + "    timestamp: new Date().toISOString()",
        indent + '  });',
        indent + '}',
        ''
      ];
      
      lines.splice(i, 0, ...broadcastCode);
      putRouteFixed = true;
      console.log('✅ Added broadcast to PUT route (ANNOUNCEMENT_UPDATED)');
      break;
    }
    
    if (inPutRoute && lines[i].includes('router.post')) {
      break;
    }
  }
  
  if (!putRouteFixed && content.includes('ANNOUNCEMENT_UPDATED')) {
    console.log('ℹ️  PUT route already has ANNOUNCEMENT_UPDATED broadcast');
  } else if (!putRouteFixed) {
    console.log('⚠️  Could not find PUT route pattern');
  }
  
  content = lines.join('\n');
  
  // 寫回文件
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\n✅ WebSocket broadcast configuration complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
