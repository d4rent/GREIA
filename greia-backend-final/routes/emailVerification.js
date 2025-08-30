const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../config/db');

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  }
});

// Send verification email
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const [users] = await pool.query('SELECT id, email_verified FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (users[0].email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store token in database
    await pool.query(
      'UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE email = ?',
      [verificationToken, expiresAt, email]
    );
    
    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    await transporter.sendMail({
      from: `"D4RENT.IE" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to D4RENT.IE!</h2>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
          <p>Or copy this link to your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
        </div>
      `
    });
    
    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Verify email token
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Find user with valid token
    const [users] = await pool.query(
      `SELECT id, email FROM users 
       WHERE email_verification_token = ? 
       AND email_verification_expires > NOW() 
       AND email_verified = 0`,
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    
    // Mark email as verified
    await pool.query(
      `UPDATE users SET 
       email_verified = 1, 
       email_verification_token = NULL, 
       email_verification_expires = NULL 
       WHERE id = ?`,
      [users[0].id]
    );
    
    res.json({ 
      message: 'Email verified successfully',
      email: users[0].email 
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

module.exports = router;
