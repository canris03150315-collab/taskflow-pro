const fs = require('fs');

const filePath = '/app/dist/routes/announcements.js';

try {
  console.log('開始修改 announcements.js 添加圖片支援...');
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. 修改 GET / 路由 - 添加 images 欄位解析
  const getRouteOld = `router.get('/', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const announcements = dbCall(db, 'prepare', 'SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json(announcements);`;
  
  const getRouteNew = `router.get('/', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const announcements = dbCall(db, 'prepare', 'SELECT * FROM announcements ORDER BY created_at DESC').all();
    
    // \\u89e3\\u6790 images JSON
    const parsed = announcements.map(ann => ({
      ...ann,
      images: ann.images ? JSON.parse(ann.images) : []
    }));
    
    res.json(parsed);`;
  
  content = content.replace(getRouteOld, getRouteNew);
  
  // 2. 修改 POST / 路由 - 添加 images 欄位
  const postRouteOld = `router.post('/', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { title, content, priority } = req.body;
    const id = \`announcement-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 'INSERT INTO announcements (id, title, content, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, title, content, priority || 'NORMAL', now, now
    );
    
    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    res.json(announcement);`;
  
  const postRouteNew = `router.post('/', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { title, content, priority, images } = req.body;
    const id = \`announcement-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    const now = new Date().toISOString();
    const imagesJson = JSON.stringify(images || []);
    
    dbCall(db, 'prepare', 'INSERT INTO announcements (id, title, content, priority, images, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, title, content, priority || 'NORMAL', imagesJson, now, now
    );
    
    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    announcement.images = JSON.parse(announcement.images || '[]');
    res.json(announcement);`;
  
  content = content.replace(postRouteOld, postRouteNew);
  
  // 3. 修改 PUT /:id 路由 - 添加 images 欄位
  const putRouteOld = `router.put('/:id', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { title, content, priority } = req.body;
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 'UPDATE announcements SET title = ?, content = ?, priority = ?, updated_at = ? WHERE id = ?').run(
      title, content, priority, now, id
    );
    
    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    res.json(announcement);`;
  
  const putRouteNew = `router.put('/:id', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { title, content, priority, images } = req.body;
    const now = new Date().toISOString();
    const imagesJson = JSON.stringify(images || []);
    
    dbCall(db, 'prepare', 'UPDATE announcements SET title = ?, content = ?, priority = ?, images = ?, updated_at = ? WHERE id = ?').run(
      title, content, priority, imagesJson, now, id
    );
    
    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    announcement.images = JSON.parse(announcement.images || '[]');
    res.json(announcement);`;
  
  content = content.replace(putRouteOld, putRouteNew);
  
  // 寫回文件
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ 成功修改 announcements.js');
  console.log('已添加:');
  console.log('  - GET / 路由解析 images JSON');
  console.log('  - POST / 路由支援 images 欄位');
  console.log('  - PUT /:id 路由支援 images 欄位');
  
} catch (error) {
  console.error('❌ 錯誤:', error.message);
  process.exit(1);
}
