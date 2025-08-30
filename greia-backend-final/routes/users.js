const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Get all users (optionally filter by agent roles)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

module.exports = router;