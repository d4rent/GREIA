const express = require('express');
const router = express.Router();
const pool = require('../config/db');
// Optional S3 attachment support (presigned uploads can be added later)

router.post('/', express.json(), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { conversation_id, body } = req.body || {};
    if (!conversation_id || !body || !body.trim()) return res.status(400).json({ message: 'conversation_id and body required' });

    // Confirm membership in conversation
    const [[membership]] = await pool.query(
      'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversation_id, userId]
    );
    if (!membership) return res.status(403).json({ message: 'Forbidden' });

    const [r] = await pool.query(
      'INSERT INTO messages (conversation_id, sender_user_id, body) VALUES (?, ?, ?)',
      [conversation_id, userId, body.trim()]
    );
    const messageId = r.insertId;

    // Update last_read for sender (so it doesn't appear unread to them)
    await pool.query(
      'UPDATE conversation_participants SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?',
      [messageId, conversation_id, userId]
    );

    res.json({ id: messageId });
  } catch (e) {
    console.error('POST /messages error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
