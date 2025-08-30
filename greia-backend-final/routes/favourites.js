const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middlewares/auth');

// POST: Save a property as favourite
router.post('/favourite', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { property_id } = req.body;
  if (!property_id) return res.status(400).json({ error: 'property_id required' });
  try {
    await pool.query(
      'INSERT IGNORE INTO favourites (user_id, item_id, item_type) VALUES (?, ?, ?)', 
      [userId, property_id, 'property']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to favourite property.' });
  }
});

// DELETE: Remove a property from favourites
router.delete('/favourite/:propertyId', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const propertyId = req.params.propertyId;
  try {
    await pool.query(
      'DELETE FROM favourites WHERE user_id = ? AND item_id = ? AND item_type = ?', 
      [userId, propertyId, 'property']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove favourite.' });
  }
});

// GET: Get all favourite properties for the logged-in user
router.get('/favourites', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, f.id AS favourite_id
       FROM favourites f
       JOIN properties p ON f.item_id = p.id
       WHERE f.user_id = ? AND f.item_type = 'property'`,
      [req.user.id]
    );
    // Add /uploads/ to image fields if present
    rows.forEach(row => {
      if (row.image) row.image = `/uploads/${row.image}`;
      if (row.company_logo) row.company_logo = `/uploads/${row.company_logo}`;
      if (row.photos) {
        try {
          const arr = JSON.parse(row.photos);
          row.photos = arr.map(photo => `/uploads/${photo}`);
        } catch {
          row.photos = [];
        }
      }
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favourites.' });
  }
});

module.exports = router;