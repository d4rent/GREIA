const db = require('./db'); // Use the connection pool from db.js

// Example: User model functions

// Get user by email
async function getUserByEmail(email) {
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
}

// Add a new user
async function addUser(user) {
  const [result] = await db.query(
    'INSERT INTO users (full_name, email, phone_number, password, role, psra_number, profile_picture) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      user.full_name,
      user.email,
      user.phone_number,
      user.password,
      user.role,
      user.psra_number,
      user.profile_picture
    ]
  );
  return result.insertId;
}

// Export model functions
module.exports = {
  getUserByEmail,
  addUser,
  db // Export the pool if needed elsewhere
};