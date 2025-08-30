const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticateToken = async (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token (e.g., "Bearer <token>")

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
      }

      try {
        // Get full user information from database
        const [users] = await pool.query(
          'SELECT id, email, full_name, role FROM users WHERE id = ?',
          [decoded.id]
        );

        if (users.length === 0) {
          return res.status(403).json({ error: 'User not found.' });
        }

        // Attach the full user object to the request
        req.user = users[0];
        next();
      } catch (dbError) {
        console.error('Database error in auth middleware:', dbError);
        return res.status(500).json({ error: 'Authentication error.' });
      }
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error.' });
  }
};

module.exports = authenticateToken;