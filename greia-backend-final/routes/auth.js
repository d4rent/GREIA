const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const authenticateToken = require('../middlewares/auth');
const router = express.Router();
const multer = require('multer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const crypto = require('crypto');

// S3 client setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Multer memory storage for S3 uploads
const upload = multer({ storage: multer.memoryStorage() });

// In-memory store for demo (use DB or Redis in production)
const phoneVerifications = {};

// **Registration**
router.post('/register', async (req, res) => {
  // Use correct field names from your schema
  const { full_name, email, password, role, phone_number, receive_notifications, receive_sms, company, company_logo } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Full name, email, password, and role are required' });
  }

  try {
    // Check if email already exists
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (full_name, email, password, role, phone_number, receive_notifications, receive_sms, company, company_logo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        full_name,
        email,
        hashedPassword,
        role,
        phone_number || null,
        receive_notifications ? 1 : 0,
        receive_sms ? 1 : 0,
        company || null,
        company_logo || null
      ]
    );
    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('Error during registration:', err.message);
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
});

// **Login**
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, full_name: user.full_name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.json({ success: true, access_token: token });
    } catch (err) {
        console.error('Error during login:', err.message);
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
});

// **User Profile (Protected)**
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, full_name, email, role, phone_number, bio, profile_picture, company, company_logo FROM users WHERE id = ?',
            [req.user.id]
        );
        const user = users[0];
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.company_logo && !user.company_logo.startsWith('http')) {
            user.company_logo = `${process.env.CLOUDFRONT_URL}/${user.company_logo}`;
        }
        res.json(user);
    } catch (err) {
        console.error('Error fetching profile:', err.message);
        res.status(500).json({ success: false, error: 'Server error fetching profile' });
    }
});

// **Update Profile with Photo Upload (Protected)**
router.put('/profile', authenticateToken, upload.fields([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'company_logo', maxCount: 1 }
]), async (req, res) => {
    const { full_name, phone_number, bio, company } = req.body;
    let profilePictureUrl, companyLogoUrl;

    try {
        // Handle profile picture upload
        if (req.files && req.files.profile_picture) {
            const file = req.files.profile_picture[0];
            const fileName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
            const key = `uploads/${fileName}`;
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
            profilePictureUrl = `${process.env.CLOUDFRONT_URL}/${key}`;
        }

        // Handle company logo upload
        if (req.files && req.files.company_logo) {
            const file = req.files.company_logo[0];
            const fileName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
            const key = `uploads/${fileName}`;
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
            companyLogoUrl = `${process.env.CLOUDFRONT_URL}/${key}`;
        }

        // Build update query
        let updateFields = ['full_name = ?', 'phone_number = ?', 'bio = ?'];
        let updateValues = [full_name, phone_number, bio];

        if (profilePictureUrl) {
            updateFields.push('profile_picture = ?');
            updateValues.push(profilePictureUrl);
        }
        if (company !== undefined) {
            updateFields.push('company = ?');
            updateValues.push(company);
        }
        if (companyLogoUrl) {
            updateFields.push('company_logo = ?');
            updateValues.push(companyLogoUrl);
        }
        updateValues.push(req.user.id);

        await pool.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile_picture: profilePictureUrl,
            company_logo: companyLogoUrl
        });
    } catch (err) {
        console.error('Error updating profile:', err.message);
        res.status(500).json({ success: false, error: 'Server error updating profile' });
    }
});

// Send verification code
router.post('/send-phone-code', async (req, res) => {
  const { phone_number } = req.body;
  if (!phone_number) return res.status(400).json({ error: 'Phone number required' });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  phoneVerifications[phone_number] = { code, expires: Date.now() + 10 * 60 * 1000 };

  // Send SMS using AWS SNS
  try {
    const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
    const sns = new SNSClient({ region: process.env.AWS_REGION });
    await sns.send(new PublishCommand({
      Message: `Your d4rent.ie verification code is: ${code}`,
      PhoneNumber: phone_number
    }));
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to send SMS:', err);
    res.status(500).json({ error: 'Failed to send verification SMS.' });
  }
});

// Verify code
router.post('/verify-phone-code', async (req, res) => {
  const { phone_number, code } = req.body;
  const record = phoneVerifications[phone_number];
  if (!record || record.code !== code || Date.now() > record.expires) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  // Optionally, update user as verified in DB here
  delete phoneVerifications[phone_number];
  res.json({ success: true });
});

// **Session Status Check (Protected)**
router.get('/session-status', authenticateToken, async (req, res) => {
    try {
        // Get token from header to decode expiry info
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        
        // Decode token to get expiry information
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - now;
        const hoursUntilExpiry = Math.floor(timeUntilExpiry / 3600);
        const minutesUntilExpiry = Math.floor((timeUntilExpiry % 3600) / 60);
        
        res.json({
            success: true,
            authenticated: true,
            user: {
                id: req.user.id,
                role: decoded.role,
                full_name: decoded.full_name,
                email: decoded.email
            },
            session: {
                issuedAt: new Date(decoded.iat * 1000).toISOString(),
                expiresAt: new Date(decoded.exp * 1000).toISOString(),
                timeUntilExpiry: {
                    seconds: timeUntilExpiry,
                    minutes: minutesUntilExpiry,
                    hours: hoursUntilExpiry,
                    formatted: `${hoursUntilExpiry}h ${minutesUntilExpiry}m`
                }
            }
        });
    } catch (err) {
        console.error('Error checking session status:', err.message);
        res.status(500).json({ success: false, error: 'Server error checking session' });
    }
});

// **Public Session Check (No auth required - for checking if token exists)**
router.post('/check-session', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.json({
                success: true,
                authenticated: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.json({
                success: true,
                authenticated: false,
                message: 'Invalid token format'
            });
        }

        // Verify the token
        const jwt = require('jsonwebtoken');
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.json({
                    success: true,
                    authenticated: false,
                    message: 'Token expired or invalid',
                    error: err.message
                });
            }

            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = decoded.exp - now;
            const hoursUntilExpiry = Math.floor(timeUntilExpiry / 3600);
            const minutesUntilExpiry = Math.floor((timeUntilExpiry % 3600) / 60);

            res.json({
                success: true,
                authenticated: true,
                user: {
                    id: decoded.id,
                    role: decoded.role,
                    full_name: decoded.full_name,
                    email: decoded.email
                },
                session: {
                    issuedAt: new Date(decoded.iat * 1000).toISOString(),
                    expiresAt: new Date(decoded.exp * 1000).toISOString(),
                    timeUntilExpiry: {
                        seconds: timeUntilExpiry,
                        minutes: minutesUntilExpiry,
                        hours: hoursUntilExpiry,
                        formatted: `${hoursUntilExpiry}h ${minutesUntilExpiry}m`
                    }
                }
            });
        });
    } catch (err) {
        console.error('Error checking session:', err.message);
        res.status(500).json({ success: false, error: 'Server error checking session' });
    }
});

module.exports = router;