const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { notifyUser } = require('../utils/notify');

// Helper to resolve agent area codes: prefers agent_profiles.area_codes JSON, fallback users.primary_area_code/users.area_code
async function getAgentAreaCodes(userId) {
  const [[u]] = await pool.query('SELECT primary_area_code, area_code FROM users WHERE id = ?', [userId]);
  const [[ap]] = await pool.query('SELECT area_codes FROM agent_profiles WHERE user_id = ?', [userId]).catch(()=>[[]]);
  let areas = [];
  if (ap && ap.area_codes) {
    try { areas = JSON.parse(ap.area_codes); } catch(e) { areas = []; }
  }
  const basic = u ? (u.primary_area_code || u.area_code) : null;
  if (basic && !areas.includes(basic)) areas.push(basic);
  return areas.filter(Boolean);
}

// Owner posts a property into the marketplace (lead generator)
router.post('/properties', express.json(), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { title, address, area_code, details } = req.body || {};
    if (!title || !area_code) return res.status(400).json({ message: 'title and area_code required' });

    const [r] = await pool.query(
      'INSERT INTO marketplace_properties (owner_user_id, title, address, area_code, details) VALUES (?, ?, ?, ?, ?)',
      [userId, title, address || null, area_code, details ? JSON.stringify(details) : null]
    );
    const mpId = r.insertId;

    // Create a lead object
    const subject = `Owner lead: ${title}`;
    const [lr] = await pool.query(
      'INSERT INTO leads (source, subject, related_id, owner_user_id, status) VALUES ("marketplace", ?, ?, ?, "new")',
      [subject, mpId, userId]
    );
    const leadId = lr.insertId;

    // Find agents in same area_code
    const [agents] = await pool.query(`
      SELECT u.id AS user_id
      FROM users u
      LEFT JOIN agent_profiles ap ON ap.user_id = u.id
      WHERE u.role = 'agent'
        AND (u.primary_area_code = ? OR u.area_code = ? OR (ap.area_codes IS NOT NULL AND JSON_CONTAINS(ap.area_codes, JSON_QUOTE(?))))
    `, [area_code, area_code, area_code]);

    for (const a of agents) {
      await pool.query('INSERT IGNORE INTO lead_matches (lead_id, agent_user_id, notified_at) VALUES (?, ?, NOW())', [leadId, a.user_id]);
      // Notify agent
      notifyUser(a.user_id, 'lead', 'New lead in your area', `A new owner lead is available: ${title}`, { lead_id: leadId, marketplace_id: mpId, area_code });
    }

    res.json({ id: mpId, lead_id: leadId, notified_agents: agents.length });
  } catch (e) {
    console.error('POST /marketplace/properties error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Agents list marketplace properties in their verified areas
router.get('/properties', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Verify role/area codes
    const [[u]] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!u || u.role !== 'agent') return res.status(403).json({ message: 'Agents only' });

    const areas = await getAgentAreaCodes(userId);
    if (!areas.length) return res.json([]);

    // Filter by optional ?status=open
    const status = (req.query.status || 'open');
    const placeholders = areas.map(_ => '?').join(',');
    const params = [...areas, status];

    const [rows] = await pool.query(
      `SELECT mp.*,
              (SELECT COUNT(*) FROM lead_matches lm WHERE lm.lead_id = l.id) AS interested_agents
       FROM marketplace_properties mp
       JOIN leads l ON l.related_id = mp.id AND l.source = 'marketplace'
       WHERE mp.area_code IN (${placeholders})
         AND mp.status = ? 
       ORDER BY mp.created_at DESC
       LIMIT 200`, params);

    res.json(rows);
  } catch (e) {
    console.error('GET /marketplace/properties error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Agent claims a lead (creates/links a conversation with owner)
router.post('/properties/:id/claim', express.json(), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const mpId = Number(req.params.id);
    // Load marketplace property + lead
    const [[mp]] = await pool.query('SELECT * FROM marketplace_properties WHERE id = ?', [mpId]);
    if (!mp) return res.status(404).json({ message: 'Not found' });

    // Verify agent area eligibility
    const areas = await getAgentAreaCodes(userId);
    if (!areas.includes(mp.area_code)) return res.status(403).json({ message: 'Not in your area' });

    const [[lead]] = await pool.query(`SELECT * FROM leads WHERE source='marketplace' AND related_id = ?`, [mpId]);
    if (!lead) return res.status(500).json({ message: 'Lead missing' });

    // mark claimed if not yet
    if (lead.status === 'new') {
      await pool.query('UPDATE leads SET status = ?, assignee_user_id = ? WHERE id = ?', ['claimed', userId, lead.id]);
      await pool.query('UPDATE marketplace_properties SET status = ? WHERE id = ?', ['engaged', mpId]);
    }

    // Create conversation between owner and claiming agent (unless exists)
    const [[existing]] = await pool.query(`
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = ?
      JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = ?
      WHERE c.subject = ? LIMIT 1
    `, [userId, mp.owner_user_id, `Marketplace: ${mp.title}`]);

    let conversationId;
    if (existing) {
      conversationId = existing.id;
    } else {
      const [cr] = await pool.query('INSERT INTO conversations (subject, created_by_user_id) VALUES (?, ?)', [`Marketplace: ${mp.title}`, userId]);
      conversationId = cr.insertId;
      await pool.query('INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES (?, ?, ?)', [conversationId, mp.owner_user_id, 'owner']);
      await pool.query('INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES (?, ?, ?)', [conversationId, userId, 'agent']);
      await pool.query('INSERT INTO messages (conversation_id, sender_user_id, body) VALUES (?, ?, ?)', [conversationId, userId, 'Hi! I'm interested in your property.']);
    }

    // Notify owner
    notifyUser(mp.owner_user_id, 'message', 'An agent reached out about your property', 'Check your GREIA inbox.', { conversation_id: conversationId, marketplace_id: mpId });

    res.json({ ok: true, conversation_id: conversationId });
  } catch (e) {
    console.error('POST /marketplace/properties/:id/claim error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
