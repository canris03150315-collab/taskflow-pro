const fs = require('fs');

const filePath = '/app/dist/routes/announcements.js';

try {
  console.log('Rewriting POST route completely...');
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find and replace the entire POST route
  const postRouteRegex = /router\.post\('\/', authenticateToken, async \(req, res\) => \{[\s\S]*?}\);/;
  
  const newPostRoute = `router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { title, content, priority, createdBy, images } = req.body;
    const id = \`announcement-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    const now = new Date().toISOString();
    const created_by = createdBy || req.user?.id || 'system';
    const imagesJson = JSON.stringify(images || []);

    dbCall(db, 'prepare', 'INSERT INTO announcements (id, title, content, priority, created_by, created_at, updated_at, read_by, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, title, content, priority || 'NORMAL', created_by, now, now, '[]', imagesJson
    );

    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    res.json(parseAnnouncementJson(announcement));
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});`;
  
  // Replace the POST route
  if (content.match(postRouteRegex)) {
    content = content.replace(postRouteRegex, newPostRoute);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Rewrote POST route with images support');
  } else {
    console.log('ERROR: Could not find POST route to replace');
    process.exit(1);
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
