const db = require('../models/db'); // Already a promise-based pool

// Helper to build local uploads URL
function getLocalUrl(filename) {
  if (!filename) return null;
  return `/uploads/${filename}`;
}

// Get the user's profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Query to fetch user details (include profile_picture)
    const userQuery = `
      SELECT first_name, last_name, email, phone, address, profile_picture
      FROM users
      WHERE id = ?
    `;

    // Query to fetch user's properties
    const propertiesQuery = `
      SELECT title, address, price, status
      FROM properties
      WHERE user_id = ?
    `;

    // Execute the user query
    const [userResults] = await db.query(userQuery, [userId]);
    if (userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add S3 URL to profile_picture if present
    const user = userResults[0];
    user.profile_picture = getLocalUrl(user.profile_picture);

    // Execute the properties query
    const [propertyResults] = await db.query(propertiesQuery, [userId]);

    // Send the combined response
    res.status(200).json({
      user,
      properties: propertyResults,
    });
  } catch (err) {
    console.error('Error in getProfile:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update the user's profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, email, phone, address } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    const query = `
      UPDATE users
      SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?
      WHERE id = ?
    `;

    const [results] = await db.query(query, [first_name, last_name, email, phone, address, userId]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error in updateProfile:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
