const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { notifyUser } = require('../utils/notify');
const requireMembership = require('../middlewares/requireMembership');

// Offer a referral (creates/attaches a conversation between agents)
router.post('/', requireMembership('pro'), express.json(), async (req, res) => {
  try {
    const fromId = req.user && req.user.id;
    if (!fromId) return res.status(401).json({ message: 'Unauthorized' });

    const { to_agent_user_id, referral_fee_pct = 25.0, property_context, conversation_id } = req.body || {};
    if (!to_agent_user_id) return res.status(400).json({ message: 'to_agent_user_id required' });
    const fee = Math.max(0, Math.min(100, Number(referral_fee_pct)));

    let convId = conversation_id;

    // If no conversation specified, create one between agents
    if (!convId) {
      // Check if an existing conversation between both agents exists
      const [[existing]] = await pool.query(`
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = ?
        JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = ?
        WHERE c.subject = 'Referral' LIMIT 1
      `, [fromId, to_agent_user_id]);
      if (existing) {
        convId = existing.id;
      } else {
        const [cr] = await pool.query('INSERT INTO conversations (subject, created_by_user_id) VALUES (?, ?)', ['Referral', fromId]);
        convId = cr.insertId;
        await pool.query('INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES (?, ?, ?)', [convId, fromId, 'agent']);
        await pool.query('INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES (?, ?, ?)', [convId, to_agent_user_id, 'agent']);
        await pool.query('INSERT INTO messages (conversation_id, sender_user_id, body) VALUES (?, ?, ?)', [convId, fromId, 'I would like to refer a client.']);
      }
    }

    const [r] = await pool.query(
      'INSERT INTO referrals (from_agent_user_id, to_agent_user_id, conversation_id, referral_fee_pct, property_context) VALUES (?, ?, ?, ?, ?)',
      [fromId, to_agent_user_id, convId, fee, property_context ? JSON.stringify(property_context) : null]
    );

    // Notify the recipient
    notifyUser(to_agent_user_id, 'referral', 'New referral offer', 'An agent sent you a referral.', { referral_id: r.insertId, conversation_id: convId, fee });

    res.json({ id: r.insertId, conversation_id: convId });
  } catch (e) {
    console.error('POST /referrals error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept referral
router.post('/:id/accept', requireMembership('pro'), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = Number(req.params.id);
    const [[ref]] = await pool.query('SELECT * FROM referrals WHERE id = ?', [id]);
    if (!ref) return res.status(404).json({ message: 'Not found' });
    if (ref.to_agent_user_id !== userId) return res.status(403).json({ message: 'Forbidden' });

    await pool.query('UPDATE referrals SET status = "accepted", updated_at = NOW() WHERE id = ?', [id]);

    notifyUser(ref.from_agent_user_id, 'referral', 'Referral accepted', 'Your referral was accepted.', { referral_id: id });

    res.json({ ok: true });
  } catch (e) {
    console.error('POST /referrals/:id/accept error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline referral
router.post('/:id/decline', requireMembership('pro'), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = Number(req.params.id);
    const [[ref]] = await pool.query('SELECT * FROM referrals WHERE id = ?', [id]);
    if (!ref) return res.status(404).json({ message: 'Not found' });
    if (ref.to_agent_user_id !== userId) return res.status(403).json({ message: 'Forbidden' });

    await pool.query('UPDATE referrals SET status = "declined", updated_at = NOW() WHERE id = ?', [id]);
    notifyUser(ref.from_agent_user_id, 'referral', 'Referral declined', 'Your referral was declined.', { referral_id: id });
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /referrals/:id/decline error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete referral (by either party)
router.post('/:id/complete', requireMembership('pro'), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = Number(req.params.id);
    const [[ref]] = await pool.query('SELECT * FROM referrals WHERE id = ?', [id]);
    if (!ref) return res.status(404).json({ message: 'Not found' });
    if (![ref.from_agent_user_id, ref.to_agent_user_id].includes(userId)) return res.status(403).json({ message: 'Forbidden' });

    await pool.query('UPDATE referrals SET status = "completed", updated_at = NOW() WHERE id = ?', [id]);
    notifyUser(ref.from_agent_user_id, 'referral', 'Referral marked completed', 'The referral has been marked as completed.', { referral_id: id });
    notifyUser(ref.to_agent_user_id, 'referral', 'Referral marked completed', 'The referral has been marked as completed.', { referral_id: id });
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /referrals/:id/complete error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my referrals (sent/received)
router.get('/', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const [rows] = await pool.query(`
      SELECT r.*, 
        (SELECT email FROM users WHERE id = r.from_agent_user_id) AS from_email,
        (SELECT email FROM users WHERE id = r.to_agent_user_id) AS to_email
      FROM referrals r
      WHERE r.from_agent_user_id = ? OR r.to_agent_user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 200
    `, [userId, userId]);

    res.json(rows);
  } catch (e) {
    console.error('GET /referrals error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single referral
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = Number(req.params.id);
    const [[ref]] = await pool.query('SELECT * FROM referrals WHERE id = ?', [id]);
    if (!ref) return res.status(404).json({ message: 'Not found' });
    if (![ref.from_agent_user_id, ref.to_agent_user_id].includes(userId)) return res.status(403).json({ message: 'Forbidden' });

    res.json(ref);
  } catch (e) {
    console.error('GET /referrals/:id error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


// Counts for badges (for the current user)
router.get('/counts', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const [[offeredToMe]] = await pool.query(
      "SELECT COUNT(*) AS c FROM referrals WHERE to_agent_user_id = ? AND status = 'offered'",
      [userId]
    );
    const [[acceptedByMe]] = await pool.query(
      "SELECT COUNT(*) AS c FROM referrals WHERE (from_agent_user_id = ? OR to_agent_user_id = ?) AND status = 'accepted'",
      [userId, userId]
    );
    res.json({ offered_to_me: offeredToMe.c || 0, accepted_active: acceptedByMe.c || 0 });
  } catch (e) {
    console.error('GET /referrals/counts error', e);
    res.status(500).json({ message: 'Server error' });
  }
});
