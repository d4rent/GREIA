const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all tags for a user
router.get('/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.* FROM user_tags ut
       JOIN tags t ON ut.tag_id = t.id
       WHERE ut.user_id = ?`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user tags.' });
  }
});

// Assign a tag to a user
router.post('/', async (req, res) => {
  const { user_id, tag_id } = req.body;
  if (!user_id || !tag_id) return res.status(400).json({ error: 'user_id and tag_id required.' });
  try {
    await pool.query('INSERT IGNORE INTO user_tags (user_id, tag_id) VALUES (?, ?)', [user_id, tag_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign tag.' });
  }
});

// Remove a tag from a user
router.delete('/', async (req, res) => {
  const { user_id, tag_id } = req.body;
  if (!user_id || !tag_id) return res.status(400).json({ error: 'user_id and tag_id required.' });
  try {
    await pool.query('DELETE FROM user_tags WHERE user_id = ? AND tag_id = ?', [user_id, tag_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove tag.' });
  }
});

module.exports = router;
