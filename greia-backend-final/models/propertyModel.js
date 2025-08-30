const db = require('./db'); // Use the connection pool from db.js

// Example: Property model functions

// Get all properties
async function getAllProperties() {
  const [rows] = await db.query('SELECT * FROM properties');
  return rows;
}

// Get a property by ID
async function getPropertyById(id) {
  const [rows] = await db.query('SELECT * FROM properties WHERE id = ?', [id]);
  return rows[0];
}

// Add a new property
async function addProperty(property) {
  const [result] = await db.query(
    'INSERT INTO properties (user_id, title, description, address, property_type, status, price, property_size, beds, agency_name, image, company_logo, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      property.user_id,
      property.title,
      property.description,
      property.address,
      property.property_type,
      property.status,
      property.price,
      property.property_size,
      property.beds,
      property.agency_name,
      property.image,
      property.company_logo,
      property.photos
    ]
  );
  return result.insertId;
}

// Export model functions
module.exports = {
  getAllProperties,
  getPropertyById,
  addProperty,
  db // Export the pool in case you need it elsewhere
};