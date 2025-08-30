const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Create a conversation (optionally with initial message)
router.post('/', express.json(), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { subject, participant_ids = [], initial_message } = req.body || {};
    if (!participant_ids.length) return res.status(400).json({ message: 'participant_ids required' });

    const [r] = await pool.query('INSERT INTO conversations (subject, created_by_user_id) VALUES (?, ?)', [subject || null, userId]);
    const conversationId = r.insertId;

    // Add creator + participants
    const participants = new Set([userId, ...participant_ids.map(Number)]);
    for (const pid of participants) {
      await pool.query(
        'INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES (?, ?, ?)',
        [conversationId, pid, pid === userId ? 'owner' : 'other']
      );
    }

    // Initial message
    if (initial_message && initial_message.trim()) {
      await pool.query(
        'INSERT INTO messages (conversation_id, sender_user_id, body) VALUES (?, ?, ?)',
        [conversationId, userId, initial_message.trim()]
      );
    }

    res.json({ id: conversationId });
  } catch (e) {
    console.error('POST /conversations error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// List my conversations (with last message + unread count)
router.get('/', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const [rows] = await pool.query(`
      SELECT c.id, c.subject, c.created_at,
             (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
             (SELECT COUNT(*) FROM messages m
                WHERE m.conversation_id = c.id
                  AND m.id > COALESCE(cp.last_read_message_id, 0)
                  AND m.sender_user_id <> ?) AS unread_count
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT 200
    `, [userId, userId]);

    res.json(rows);
  } catch (e) {
    console.error('GET /conversations error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single conversation with messages
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = Number(req.params.id);
    const [[conv]] = await pool.query(`
      SELECT c.*
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
      WHERE c.id = ?
    `, [userId, id]);
    if (!conv) return res.status(404).json({ message: 'Not found' });

    const [participants] = await pool.query(`
      SELECT user_id, role FROM conversation_participants WHERE conversation_id = ?
    `, [id]);

    const [messages] = await pool.query(`
      SELECT id, sender_user_id, body, attachment_s3_key, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY id ASC
      LIMIT 500
    `, [id]);

    res.json({ conversation: conv, participants, messages });
  } catch (e) {
    console.error('GET /conversations/:id error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark conversation as read (update last_read_message_id)
router.patch('/:id/read', express.json(), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = Number(req.params.id);
    const [[row]] = await pool.query('SELECT id FROM conversations WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ message: 'Not found' });

    const [[last]] = await pool.query('SELECT id FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1', [id]);
    const lastId = last ? last.id : 0;
    await pool.query(
      'UPDATE conversation_participants SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?',
      [lastId, id, userId]
    );
    res.json({ ok: true, last_read_message_id: lastId });
  } catch (e) {
    console.error('PATCH /conversations/:id/read error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
