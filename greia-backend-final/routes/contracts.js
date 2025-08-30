const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { notifyUser } = require('../utils/notify');

// Use aws-sdk v2 for presigned URL (consistent with existing server usage)
let s3 = null;
let s3Bucket = null;
try {
  const aws = require('aws-sdk');
  if (process.env.AWS_REGION) aws.config.update({ region: process.env.AWS_REGION });
  s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
  s3Bucket = process.env.AWS_S3_BUCKET;
} catch (e) {
  // ignore
}

// Create a contract draft and return a presigned upload URL for PDF
router.post('/', express.json(), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { title, type = 'custom' } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title required' });
    if (!s3 || !s3Bucket) return res.status(500).json({ message: 'File upload not configured' });

    const key = `contracts/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
    const params = { Bucket: s3Bucket, Key: key, Expires: 300, ContentType: 'application/pdf' };
    const upload_url = s3.getSignedUrl('putObject', params);

    const [r] = await pool.query(
      'INSERT INTO contracts (created_by_user_id, title, type, file_s3_key) VALUES (?, ?, ?, ?)',
      [userId, title, type, key]
    );

    res.json({ id: r.insertId, upload_url, s3_key: key });
  } catch (e) {
    console.error('POST /contracts error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Attach contract to conversation and mark as sent; add signers
router.post('/:id/send', express.json(), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = Number(req.params.id);
    const { conversation_id, signer_ids = [] } = req.body || {};
    if (!conversation_id) return res.status(400).json({ message: 'conversation_id required' });

    // Verify user is in the conversation
    const [[cp]] = await pool.query(
      'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversation_id, userId]
    );
    if (!cp) return res.status(403).json({ message: 'Forbidden' });

    await pool.query(
      'UPDATE contracts SET conversation_id = ?, status = "sent", sent_at = NOW() WHERE id = ?',
      [conversation_id, id]
    );

    // Add signers (unique)
    const participants = new Set([userId, ...signer_ids.map(Number)]);
    for (const uid of participants) {
      await pool.query(
        'INSERT IGNORE INTO contract_signers (contract_id, user_id) VALUES (?, ?)',
        [id, uid]
      );
      // Notify signer (except sender)
      if (uid !== userId) {
        notifyUser(uid, 'contract', 'New contract to sign', 'A contract was sent to you for signature.', { contract_id: id, conversation_id });
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('POST /contracts/:id/send error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Simple sign endpoint (MVP click-to-sign)
router.post('/:id/sign', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = Number(req.params.id);

    // Ensure user is a signer
    const [[s]] = await pool.query(
      'SELECT id FROM contract_signers WHERE contract_id = ? AND user_id = ?',
      [id, userId]
    );
    if (!s) return res.status(403).json({ message: 'Not a signer' });

    await pool.query(
      'UPDATE contract_signers SET signed_at = NOW() WHERE contract_id = ? AND user_id = ?',
      [id, userId]
    );

    // If all signers signed -> mark contract as signed
    const [[pending]] = await pool.query(
      'SELECT COUNT(*) AS c FROM contract_signers WHERE contract_id = ? AND signed_at IS NULL',
      [id]
    );
    if (pending && pending.c === 0) {
      await pool.query('UPDATE contracts SET status = "signed", signed_at = NOW() WHERE id = ?', [id]);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('POST /contracts/:id/sign error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contract (meta + signers)
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const id = Number(req.params.id);
    const [[c]] = await pool.query('SELECT * FROM contracts WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ message: 'Not found' });

    // Visibility: user must be creator, signer, or in the conversation
    let allowed = false;
    if (c.created_by_user_id === userId) allowed = true;
    if (c.conversation_id) {
      const [[p]] = await pool.query('SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?', [c.conversation_id, userId]);
      if (p) allowed = true;
    }
    if (!allowed) {
      const [[s]] = await pool.query('SELECT id FROM contract_signers WHERE contract_id = ? AND user_id = ?', [id, userId]);
      if (s) allowed = true;
    }
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    const [signers] = await pool.query('SELECT user_id, role, signed_at FROM contract_signers WHERE contract_id = ?', [id]);
    res.json({ contract: c, signers });
  } catch (e) {
    console.error('GET /contracts/:id error', e);
    res.status(500).json({ message: 'Server error' });
  }
});


// List contracts by conversation_id
router.get('/', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const convId = Number(req.query.conversation_id || 0);
    if (!convId) return res.status(400).json({ message: 'conversation_id required' });

    // user must be in the conversation
    const [[p]] = await pool.query('SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?', [convId, userId]);
    if (!p) return res.status(403).json({ message: 'Forbidden' });

    const [rows] = await pool.query('SELECT * FROM contracts WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 50', [convId]);
    const ids = rows.map(r => r.id);
    const [signers] = ids.length ? await pool.query('SELECT contract_id, user_id, role, signed_at FROM contract_signers WHERE contract_id IN (?)', [ids]) : [[]];
    const byId = {};
    rows.forEach(r => byId[r.id] = { contract: r, signers: [] });
    (signers || []).forEach(s => { if (byId[s.contract_id]) byId[s.contract_id].signers.push(s); });
    res.json(Object.values(byId));
  } catch (e) {
    console.error('GET /contracts error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Presigned download URL for a contract PDF
router.get('/:id/download_url', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!s3 || !s3Bucket) return res.status(500).json({ message: 'File access not configured' });

    const id = Number(req.params.id);
    const [[c]] = await pool.query('SELECT * FROM contracts WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ message: 'Not found' });

    // visibility check as in GET /:id
    let allowed = (c.created_by_user_id === userId);
    if (c.conversation_id && !allowed) {
      const [[p]] = await pool.query('SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?', [c.conversation_id, userId]);
      if (p) allowed = true;
    }
    if (!allowed) {
      const [[s]] = await pool.query('SELECT id FROM contract_signers WHERE contract_id = ? AND user_id = ?', [id, userId]);
      if (s) allowed = true;
    }
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    const key = c.file_s3_key;
    if (!key) return res.status(400).json({ message: 'No file key' });
    const url = s3.getSignedUrl('getObject', { Bucket: s3Bucket, Key: key, Expires: 300 });
    res.json({ url });
  } catch (e) {
    console.error('GET /contracts/:id/download_url error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Count contracts awaiting my signature
router.get('/pending/count', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS c FROM contract_signers WHERE user_id = ? AND signed_at IS NULL',
      [userId]
    );
    res.json({ pending: row ? row.c : 0 });
  } catch (e) {
    console.error('GET /contracts/pending/count error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
