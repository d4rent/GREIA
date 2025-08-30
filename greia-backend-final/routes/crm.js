const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// CONTACTS
router.get('/contacts', async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const [rows] = await pool.query('SELECT * FROM contacts WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT 500', [userId]);
  res.json(rows);
});
router.post('/contacts', express.json(), async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { full_name, email, phone, company, tags } = req.body || {};
  if (!full_name) return res.status(400).json({ message: 'full_name required' });
  const [r] = await pool.query(
    'INSERT INTO contacts (owner_user_id, full_name, email, phone, company, tags) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, full_name, email || null, phone || null, company || null, tags ? JSON.stringify(tags) : null]
  );
  res.json({ id: r.insertId });
});
router.put('/contacts/:id', express.json(), async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const id = Number(req.params.id);
  const fields = ['full_name','email','phone','company','tags'];
  const sets = []; const vals = [];
  fields.forEach(k => { if (k in req.body) { sets.push(`${k} = ?`); vals.push(k==='tags' ? JSON.stringify(req.body[k]) : req.body[k]); } });
  if (!sets.length) return res.json({ ok: true });
  vals.push(id, userId);
  await pool.query(`UPDATE contacts SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ? AND owner_user_id = ?`, vals);
  res.json({ ok: true });
});
router.delete('/contacts/:id', async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const id = Number(req.params.id);
  await pool.query('DELETE FROM contacts WHERE id = ? AND owner_user_id = ?', [id, userId]);
  res.json({ ok: true });
});

// DEALS
router.get('/deals', async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const [rows] = await pool.query('SELECT * FROM deals WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT 500', [userId]);
  res.json(rows);
});
router.post('/deals', express.json(), async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { title, amount_cents = 0, stage = 'new', contact_id = null, source = 'manual' } = req.body || {};
  if (!title) return res.status(400).json({ message: 'title required' });
  const [r] = await pool.query(
    'INSERT INTO deals (owner_user_id, contact_id, title, amount_cents, stage, source) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, contact_id, title, amount_cents, stage, source]
  );
  res.json({ id: r.insertId });
});
router.put('/deals/:id', express.json(), async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const id = Number(req.params.id);
  const fields = ['title','amount_cents','stage','contact_id','source'];
  const sets = []; const vals = [];
  fields.forEach(k => { if (k in req.body) { sets.push(`${k} = ?`); vals.push(req.body[k]); } });
  if (!sets.length) return res.json({ ok: true });
  vals.push(id, userId);
  await pool.query(`UPDATE deals SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ? AND owner_user_id = ?`, vals);
  res.json({ ok: true });
});
router.delete('/deals/:id', async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const id = Number(req.params.id);
  await pool.query('DELETE FROM deals WHERE id = ? AND owner_user_id = ?', [id, userId]);
  res.json({ ok: true });
});

// TASKS
router.get('/tasks', async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const [rows] = await pool.query('SELECT * FROM tasks WHERE owner_user_id = ? ORDER BY status ASC, due_at ASC NULLS LAST, created_at DESC LIMIT 500', [userId]);
  res.json(rows);
});
router.post('/tasks', express.json(), async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { title, due_at = null, related_type = null, related_id = null } = req.body || {};
  if (!title) return res.status(400).json({ message: 'title required' });
  const [r] = await pool.query(
    'INSERT INTO tasks (owner_user_id, title, due_at, related_type, related_id) VALUES (?, ?, ?, ?, ?)',
    [userId, title, due_at, related_type, related_id]
  );
  res.json({ id: r.insertId });
});
router.put('/tasks/:id', express.json(), async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const id = Number(req.params.id);
  const fields = ['title','due_at','status','related_type','related_id'];
  const sets = []; const vals = [];
  fields.forEach(k => { if (k in req.body) { sets.push(`${k} = ?`); vals.push(req.body[k]); } });
  if (!sets.length) return res.json({ ok: true });
  vals.push(id, userId);
  await pool.query(`UPDATE tasks SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ? AND owner_user_id = ?`, vals);
  res.json({ ok: true });
});
router.delete('/tasks/:id', async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const id = Number(req.params.id);
  await pool.query('DELETE FROM tasks WHERE id = ? AND owner_user_id = ?', [id, userId]);
  res.json({ ok: true });
});

// NOTES
router.get('/notes', async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const [rows] = await pool.query('SELECT * FROM notes WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT 500', [userId]);
  res.json(rows);
});
router.post('/notes', express.json(), async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { body, related_type = null, related_id = null } = req.body || {};
  if (!body) return res.status(400).json({ message: 'body required' });
  const [r] = await pool.query(
    'INSERT INTO notes (owner_user_id, body, related_type, related_id) VALUES (?, ?, ?, ?)',
    [userId, body, related_type, related_id]
  );
  res.json({ id: r.insertId });
});
router.delete('/notes/:id', async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const id = Number(req.params.id);
  await pool.query('DELETE FROM notes WHERE id = ? AND owner_user_id = ?', [id, userId]);
  res.json({ ok: true });
});

module.exports = router;
