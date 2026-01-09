const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.json({
      version: '3.9.0',
      name: 'TaskFlow Pro',
      build: new Date().toISOString(),
      status: 'running'
    });
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

module.exports = router;
