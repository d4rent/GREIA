const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models/db');

// User login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      access_token: token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        profile_picture: user.profile_picture ? `/uploads/${user.profile_picture}` : null,
      },
    });
  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Registration (with optional profile picture upload)
exports.register = async (req, res) => {
  const { full_name, email, password, phone_number, role } = req.body;
  let profilePictureFilename = null;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required' });
  }

  try {
    if (req.file) {
      profilePictureFilename = req.file.filename; // multer.diskStorage saves the file
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (full_name, email, password, phone_number, role, profile_picture)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.query(query, [full_name, email, hashedPassword, phone_number, role, profilePictureFilename]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error during registration:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user profile (protected)
exports.getProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, role, phone_number, bio, profile_picture FROM users WHERE id = ?',
      [req.user.id]
    );
    const user = users[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.profile_picture = user.profile_picture ? `/uploads/${user.profile_picture}` : null;
    res.json(user);
  } catch (err) {
    console.error('Error fetching profile:', err.message);
    res.status(500).json({ success: false, error: 'Server error fetching profile' });
  }
};