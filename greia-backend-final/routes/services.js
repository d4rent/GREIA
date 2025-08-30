const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticateToken = require('../middlewares/auth');
const pool = require('../config/db');
const nodemailer = require('nodemailer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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
      ContentType: file.mimetype,
    }
  });
  await s3Upload.done();
  return key; // Save only the key in DB
}

// Helper to delete from S3
async function deleteFromS3(keyOrUrl) {
  if (!keyOrUrl) return;
  let key = keyOrUrl;
  if (keyOrUrl.startsWith('http')) {
    key = keyOrUrl.split('/').pop();
  }
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }));
  } catch (err) {
    if (err.name !== 'NoSuchKey') {
      console.error('Failed to delete S3 object:', err);
    }
  }
}

// Utility to generate a discount code
function generateDiscountCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. Add Service (with discount fields)
router.post('/', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { title, name, address, phone_number, phone, email, bio, description, link, discount_percent, discount_code } = req.body;
    let photo = null;
    if (req.file) {
      photo = await uploadToS3(req.file);
    }
    const code = discount_code && discount_code.trim() ? discount_code : generateDiscountCode();
    
    // Use correct column names that exist in the database
    const serviceName = name || title; // Use 'name' if provided, fallback to 'title'
    const servicePhone = phone || phone_number; // Use 'phone' if provided, fallback to 'phone_number'
    const serviceDescription = description || bio; // Use 'description' if provided, fallback to 'bio'
    
    await pool.query(
      'INSERT INTO services (name, photo, address, phone, email, description, website, user_id, discount_code, discount_percent, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [serviceName, photo, address, servicePhone, email, serviceDescription, link, req.user.id, code, discount_percent, 'pending']
    );
    res.json({ 
      success: true, 
      discount_code: code, 
      discount_percent,
      message: 'Service submitted for review. It will be published once approved by our team.'
    });
  } catch (err) {
    console.error('Service creation error:', err);
    console.error('Request body received:', req.body);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });
    res.status(500).json({ error: 'Failed to add service.', details: err.message });
  }
});

// 2. Create Service (with Payment Verification)
router.post('/', authenticateToken, async (req, res) => {
  const { payment_intent_id, listing_fee_paid, listing_duration, ...serviceData } = req.body;
  try {
    // Verify payment
    const intent = await require('stripe')(process.env.STRIPE_SECRET_KEY).paymentIntents.retrieve(payment_intent_id);
    if (intent.status !== 'succeeded') {
      return res.status(402).json({ error: 'Payment not completed' });
    }
    // TODO: Create service logic using serviceData, listing_fee_paid, listing_duration
    // Example:
    // const [result] = await db.query('INSERT INTO services (...) VALUES (...)', [...]);
    res.json({ service: {/* service object */} });
  } catch (err) {
    res.status(500).json({ error: 'Service creation failed.' });
  }
});

// View User's Services
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    const services = rows.map(service => ({
      ...service,
      photo: service.photo
  ? `${process.env.CLOUDFRONT_URL}/${service.photo}`
  : ''
    }));
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services.' });
  }
});

// 4. Get User Services
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const [services] = await require('../models/db').query('SELECT * FROM services WHERE user_id = ?', [req.user.id]);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Unable to retrieve services.' });
  }
});

// View All Services (public) - only show approved services
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM services WHERE status = "active" ORDER BY created_at DESC';
    const params = [];
    
    // Add approval filter support
    if (req.query.approved === '1') {
      query = 'SELECT * FROM services WHERE status = "active" ORDER BY created_at DESC';
    }
    
    const [rows] = await pool.query(query, params);
    const services = rows.map(service => ({
      ...service,
      photo: service.photo
  ? `${process.env.CLOUDFRONT_URL}/${service.photo}`
  : ''
    }));
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services.' });
  }
});

// Get single service by ID (for editing)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM services WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    const service = rows[0];
service.photo = service.photo
  ? `${process.env.CLOUDFRONT_URL}/${service.photo}`
  : '';
res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service.' });
  }
});

// Edit Service (PUT, also handles photo replacement)
router.put('/:id', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { title, name, address, phone_number, phone, email, bio, description, link, discount_code, discount_percent } = req.body;
    let photo = null;

    // Get current photo for possible deletion
    const [rows] = await pool.query('SELECT photo FROM services WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Service not found or not authorized.' });
    }
    const oldPhoto = rows[0].photo;

    // Use correct column names that exist in the database
    const serviceName = name || title; // Use 'name' if provided, fallback to 'title'
    const servicePhone = phone || phone_number; // Use 'phone' if provided, fallback to 'phone_number'
    const serviceDescription = description || bio; // Use 'description' if provided, fallback to 'bio'

    let query = 'UPDATE services SET name=?, address=?, phone=?, email=?, description=?, website=?, discount_code=?, discount_percent=?';
    let params = [serviceName, address, servicePhone, email, serviceDescription, link, discount_code, discount_percent];

    if (req.file) {
      photo = await uploadToS3(req.file);
      query += ', photo=?';
      params.push(photo);
    }
    query += ' WHERE id=? AND user_id=?';
    params.push(req.params.id, req.user.id);

    const [result] = await pool.query(query, params);
    if (result.affectedRows === 0) {
      if (photo) await deleteFromS3(photo);
      return res.status(404).json({ error: 'Service not found or not authorized.' });
    }

    // Delete old photo from S3 if replaced
    if (photo && oldPhoto && oldPhoto !== photo) {
      await deleteFromS3(oldPhoto);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Service update error:', err);
    console.error('Request body received:', req.body);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });
    res.status(500).json({ error: 'Failed to update service.', details: err.message });
  }
});

// Delete Service (also deletes photo)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Get photo filename before deleting
    const [rows] = await pool.query('SELECT photo FROM services WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Service not found or not authorized.' });
    }
    const photo = rows[0].photo;
    const [result] = await pool.query('DELETE FROM services WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Service not found or not authorized.' });
    }
    if (photo) await deleteFromS3(photo);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service.' });
  }
});

// Send Discount Code
router.post('/discount', async (req, res) => {
  const { email, service_id } = req.body;
  if (!email || !service_id) return res.json({ success: false, error: 'Email and service ID required' });

  // Look up the discount code and percent for the service
  try {
    const [rows] = await pool.query('SELECT discount_code, discount_percent FROM services WHERE id = ?', [service_id]);
    if (!rows.length) return res.json({ success: false, error: 'Service not found.' });
    const { discount_code, discount_percent } = rows[0];

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      }
    });

    await transporter.sendMail({
      from: `"D4RENT.IE" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your Service Discount Code',
      text: `Here is your discount code: ${discount_code} for ${discount_percent}% off!`,
      html: `<b>Here is your discount code: ${discount_code}</b><br>Discount: <b>${discount_percent}% off</b>`
    });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: 'Failed to send email.' });
  }
});

// Track service discount button clicks
router.post('/:id/click', async (req, res) => {
  try {
    // Note: clicks column doesn't exist in current database schema
    // await pool.query(
    //   'UPDATE services SET clicks = IFNULL(clicks,0) + 1 WHERE id = ?',
    //   [req.params.id]
    // );
    res.json({ success: true, message: 'Click tracked (feature disabled)' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record service click.' });
  }
});

module.exports = router;