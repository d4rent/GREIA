const pool = require('../config/db');

module.exports = function requireMembership(level = 'pro') {
  return async function(req, res, next) {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ message: 'Unauthorized' });
      // Expect a subscriptions table with status and end_date
      const [rows] = await pool.query(
        `SELECT status, end_date FROM subscriptions WHERE user_id = ? ORDER BY end_date DESC LIMIT 1`,
        [req.user.id]
      );
      if (!rows.length) return res.status(402).json({ message: 'Membership required' });
      const sub = rows[0];
      const active = (sub.status === 'active') && (!sub.end_date || new Date(sub.end_date) > new Date());
      if (!active) return res.status(402).json({ message: 'Membership inactive' });
      next();
    } catch (e) {
      console.error('requireMembership error', e);
      res.status(500).json({ message: 'Server error' });
    }
  };
};
