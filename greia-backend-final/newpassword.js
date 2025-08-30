const bcrypt = require('bcrypt');

const newPassword = 'Rosemary156980'; // Plain text password
bcrypt.hash(newPassword, 10, (err, hash) => {
  if (err) throw err;
  console.log('Hashed password:', hash); // Output the hashed password
});