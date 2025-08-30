const db = require('../models/db'); // Promise-based pool

// Helper to build local uploads URL
function getLocalUrl(filename) {
  if (!filename) return null;
  return `/uploads/${filename}`;
}

// Get All Properties
exports.getAllProperties = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM properties');
    results.forEach(row => {
      if (row.image) row.image = getLocalUrl(row.image);
      if (row.company_logo) row.company_logo = getLocalUrl(row.company_logo);
      if (row.photos) {
        try {
          const arr = JSON.parse(row.photos);
          row.photos = arr.map(getLocalUrl);
        } catch {
          row.photos = [];
        }
      }
    });
    res.json(results);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Server error');
  }
};

// Get Properties by User
exports.getUserProperties = async (req, res) => {
  const userId = req.user.id;
  try {
    const [results] = await db.query('SELECT * FROM properties WHERE user_id = ?', [userId]);
    results.forEach(row => {
      if (row.image) row.image = getLocalUrl(row.image);
      if (row.company_logo) row.company_logo = getLocalUrl(row.company_logo);
      if (row.photos) {
        try {
          const arr = JSON.parse(row.photos);
          row.photos = arr.map(getLocalUrl);
        } catch {
          row.photos = [];
        }
      }
    });
    res.json(results);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Server error');
  }
};

// Add a New Property
exports.addProperty = async (req, res) => {
  const userId = req.user.id;
  const { title, address, price, status } = req.body;
  try {
    await db.query(
      `INSERT INTO properties (title, address, price, status, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [title, address, price, status || 'available', userId]
    );
    res.status(201).send('Property added successfully');
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Error adding property');
  }
};

// Update a Property with Photos and Description
exports.updateProperty = async (req, res) => {
  const userId = req.user.id;
  const { id, title, address, price, status, description, photos } = req.body;
  try {
    const [results] = await db.query(
      `UPDATE properties
       SET title = ?, address = ?, price = ?, status = ?, description = ?, photos = ?
       WHERE id = ? AND user_id = ?`,
      [title, address, price, status, description || '', JSON.stringify(photos || []), id, userId]
    );
    if (results.affectedRows === 0) {
      return res.status(404).send('Property not found or unauthorized');
    }
    res.status(200).send('Property updated successfully');
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Server error');
  }
};

// Delete a Property
exports.deleteProperty = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const [results] = await db.query(
      'DELETE FROM properties WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (results.affectedRows === 0) {
      return res.status(404).send('Property not found or unauthorized');
    }
    res.status(200).send('Property deleted successfully');
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Server error');
  }
};