
const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Mock auth middleware – replace with your real one
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const TIER_LIMITS = {
  0: 0,
  1: 10,
  2: 20,
  3: 50
};

// --- POST /api/save-agent ---
router.post('/', requireAuth, async (req, res) => {
  const saverId = req.user.id;
  const { savedId } = req.body;

  try {
    const [saverRows] = await db.query("SELECT tier, saves_used, type FROM users WHERE id = ?", [saverId]);
    const saver = saverRows[0];

    if (!saver || saver.type !== 'referral agent') {
      return res.status(403).json({ status: "noTier" });
    }

    const limit = TIER_LIMITS[saver.tier] || 0;
    if (limit === 0) {
      return res.status(403).json({ status: "noTier" });
    }

    if (saver.saves_used >= limit) {
      return res.status(403).json({ status: "quotaExceeded", nextTier: saver.tier + 1 });
    }

    const [existing] = await db.query("SELECT * FROM saved_agents WHERE saver_id = ? AND saved_id = ?", [saverId, savedId]);
    if (existing.length > 0) {
      return res.status(200).json({ status: "success" });
    }

    await db.query("INSERT INTO saved_agents (saver_id, saved_id) VALUES (?, ?)", [saverId, savedId]);
    await db.query("UPDATE users SET saves_used = saves_used + 1 WHERE id = ?", [saverId]);

    return res.status(200).json({ status: "success" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// --- GET /api/save-agent/saved-list ---
router.get('/saved-list', requireAuth, async (req, res) => {
  const saverId = req.user.id;
  try {
    const [saved] = await db.query(
      "SELECT u.id, u.full_name, u.email, u.profile_picture FROM saved_agents sa JOIN users u ON sa.saved_id = u.id WHERE sa.saver_id = ?",
      [saverId]
    );
    return res.json(saved);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Unable to retrieve saved agents" });
  }
});

// --- POST /api/save-agent/upgrade ---
router.post('/upgrade', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { newTier } = req.body;

  try {
    await db.query("UPDATE users SET tier = ?, saves_used = 0 WHERE id = ?", [newTier, userId]);
    return res.json({ status: "upgraded", tier: newTier });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Upgrade failed" });
  }
});

// --- GET /api/save-agent/dashboard ---
router.get('/dashboard', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query("SELECT tier, saves_used FROM users WHERE id = ?", [userId]);
    const tier = rows[0].tier;
    const used = rows[0].saves_used;
    const limit = TIER_LIMITS[tier] || 0;

    return res.json({ tier, saves_used: used, limit });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Dashboard error" });
  }
});

module.exports = router;
