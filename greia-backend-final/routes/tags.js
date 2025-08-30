const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all tags
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tags ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tags.' });
  }
});

// Create a new tag
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Tag name required.' });
  try {
    await pool.query('INSERT INTO tags (name) VALUES (?)', [name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tag.' });
  }
});

// Update a tag
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('UPDATE tags SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tag.' });
  }
});

// Delete a tag
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tags WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tag.' });
  }
});

module.exports = router;
