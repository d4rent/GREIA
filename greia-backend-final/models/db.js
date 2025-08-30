const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST,       // Database host (e.g., localhost or IP address)
  user: process.env.DB_USER,       // Database username
  password: process.env.DB_PASSWORD, // Database password
  database: process.env.DB_NAME,   // Database name
  waitForConnections: true,        // Wait for available connections
  connectionLimit: 10,             // Maximum number of connections in the pool
  queueLimit: 0,                   // No limit for queued connection requests
});

// Test the database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1); // Exit the application if the database connection fails
  }
  console.log('Connected to the database');
  connection.release(); // Release the connection back to the pool
});

module.exports = db.promise();