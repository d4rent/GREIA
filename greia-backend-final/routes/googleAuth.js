const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'https://api.d4rent.ie'}/api/auth/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with Google ID
      let [users] = await pool.query(
        'SELECT * FROM users WHERE google_id = ? OR email = ?', 
        [profile.id, profile.emails[0].value]
      );
      
      if (users.length > 0) {
        // User exists, update with Google ID if not already set
        if (!users[0].google_id) {
          await pool.query(
            'UPDATE users SET google_id = ?, auth_provider = "google" WHERE id = ?',
            [profile.id, users[0].id]
          );
        }
        return done(null, users[0]);
      }
      
      // Create new user
      const [result] = await pool.query(
        `INSERT INTO users (full_name, email, google_id, auth_provider, role, password) 
         VALUES (?, ?, ?, 'google', 'customer', 'google_oauth')`,
        [profile.displayName, profile.emails[0].value, profile.id]
      );
      
      const newUser = {
        id: result.insertId,
        full_name: profile.displayName,
        email: profile.emails[0].value,
        google_id: profile.id,
        role: 'customer'
      };
      
      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Google OAuth routes
const express = require('express');
const router = express.Router();

// Initiate Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign(
      { id: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Redirect to frontend with token - use fallback if FRONTEND_URL is not set
    const frontendUrl = process.env.FRONTEND_URL || 'https://d4rent.ie';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

module.exports = router;
