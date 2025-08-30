const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET agents with property_types, service_types, service_areas, profession, and business_type
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, profile_picture, address, phone_number, email, role, property_types, service_types, service_areas
       FROM users
       WHERE role IN ('advertiser', 'service_agent', 'real_estate_agent')`
    );
    // If profile_picture is a full URL (S3), leave as is. If it's a filename, prepend CloudFront URL.
    rows.forEach(agent => {
      if (agent.profile_picture) {
        if (!agent.profile_picture.startsWith('http')) {
          agent.profile_picture = `https://d4rent.ie.s3-website-eu-west-1.amazonaws.com/${agent.profile_picture}`;
        }
      }
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents.' });
  }
});

module.exports = router;