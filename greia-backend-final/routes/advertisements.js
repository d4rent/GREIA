const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticateToken = require('../middlewares/auth');
const requirePayment = require('../middlewares/requirePayment');
const pool = require('../config/db');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

// S3 client setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Multer memory storage for S3 uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Helper to upload to S3
async function uploadToS3(file) {
  const fileName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
  const key = `uploads/${fileName}`; // Always use 'uploads/' folder
  const s3Upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }
  });
  await s3Upload.done();
  return `${process.env.CLOUDFRONT_URL}/${key}`;
}

// Helper to delete from S3
async function deleteFromS3(url) {
  if (!url) return;
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  // Extract the key from the URL (uploads/filename)
  let key = url;
  if (url.startsWith('http')) {
    const urlParts = url.split('/');
    key = urlParts.slice(-2).join('/'); // handles uploads/filename.jpg
  }
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }));
  } catch (err) {
    // Ignore if not found
    if (err.name !== 'NoSuchKey') {
      console.error('Failed to delete S3 object:', err);
    }
  }
}

// Add Advertisement (paywall enforced)
router.post('/', authenticateToken, requirePayment, upload.single('photo'), async (req, res) => {
  try {
    const { title, address, phone_number, email, bio, link } = req.body;
    let photoUrl = null;
    if (req.file) {
      photoUrl = await uploadToS3(req.file);
    }
    await pool.query(
      'INSERT INTO advertisements (title, photo, address, phone_number, email, bio, link, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, photoUrl, address, phone_number, email, bio, link, req.user.id, 'pending']
    );
    res.json({ 
      success: true, 
      message: 'Advertisement submitted for review. It will be published once approved by our team.' 
    });
  } catch (err) {
    console.error('Advertisement creation error:', err);
    console.error('Request body received:', req.body);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });
    res.status(500).json({ error: 'Failed to add advertisement.', details: err.message });
  }
});

// View User's Advertisements
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM advertisements WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch advertisements.' });
  }
});

// View All Advertisements (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT title, photo, link, address FROM advertisements WHERE status = ? ORDER BY created_at DESC', ['approved']);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch advertisements.' });
  }
});

// Get single advertisement by ID (for editing)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM advertisements WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Advertisement not found.' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch advertisement.' });
  }
});

// Delete Advertisement (also deletes photo from S3)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Get photo URL before deleting
    const [rows] = await pool.query('SELECT photo FROM advertisements WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Advertisement not found or not authorized.' });
    }
    const photoUrl = rows[0].photo;
    const [result] = await pool.query('DELETE FROM advertisements WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Advertisement not found or not authorized.' });
    }
    // Delete photo from S3 if it exists
    await deleteFromS3(photoUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete advertisement.' });
  }
});

// Edit Advertisement (PUT, also handles photo replacement)
router.put('/:id', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { title, address, phone_number, email, bio, link } = req.body;
    let photoUrl = null;

    // Get current photo for possible deletion
    const [rows] = await pool.query('SELECT photo FROM advertisements WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Advertisement not found or not authorized.' });
    }
    const oldPhotoUrl = rows[0].photo;

    let query = 'UPDATE advertisements SET title=?, address=?, phone_number=?, email=?, bio=?, link=?';
    let params = [title, address, phone_number, email, bio, link];

    if (req.file) {
      photoUrl = await uploadToS3(req.file);
      query += ', photo=?';
      params.push(photoUrl);
    }
    query += ' WHERE id=? AND user_id=?';
    params.push(req.params.id, req.user.id);

    const [result] = await pool.query(query, params);
    if (result.affectedRows === 0) {
      // Clean up uploaded file from S3 if not authorized
      if (photoUrl) {
        await deleteFromS3(photoUrl);
      }
      return res.status(404).json({ error: 'Advertisement not found or not authorized.' });
    }

    // Delete old photo from S3 if replaced
    if (photoUrl && oldPhotoUrl && oldPhotoUrl !== photoUrl) {
      await deleteFromS3(oldPhotoUrl);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Advertisement update error:', err);
    console.error('Request body received:', req.body);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });
    res.status(500).json({ error: 'Failed to update advertisement.', details: err.message });
  }
});

// Track advertisement link clicks
router.post('/:id/click', async (req, res) => {
  try {
    // Note: clicks column doesn't exist in current database schema
    // await pool.query(
    //   'UPDATE advertisements SET clicks = IFNULL(clicks,0) + 1 WHERE id = ?',
    //   [req.params.id]
    // );
    res.json({ success: true, message: 'Click tracked (feature disabled)' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record click.' });
  }
});

module.exports = router;