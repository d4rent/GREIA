const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const pool = require('../config/db');

// Property views analytics (per user)
router.get('/property-views', authenticateToken, async (req, res) => {
  const days = parseInt(req.query.range) || 7;
  try {
    // Get all properties for this user
    const [properties] = await pool.query(
      'SELECT id FROM properties WHERE user_id = ?', [req.user.id]
    );
    if (!properties.length) {
      return res.json({ labels: [], data: [] });
    }
    const propertyIds = properties.map(p => p.id);

    // Aggregate views per day for the last N days
    const [rows] = await pool.query(
      `
      SELECT DATE(viewed_at) as day, COUNT(*) as views
      FROM property_views
      WHERE property_id IN (?) AND viewed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY day
      ORDER BY day
      `,
      [propertyIds, days - 1]
    );

    // Build labels and data arrays
    const labels = [];
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      labels.push(label);
      const row = rows.find(r => {
        const rowDate = new Date(r.day);
        return rowDate.getDate() === d.getDate() && rowDate.getMonth() === d.getMonth();
      });
      data.push(row ? row.views : 0);
    }

    res.json({ labels, data });
  } catch (err) {
    res.status(500).json({ labels: [], data: [] });
  }
});

module.exports = router;
