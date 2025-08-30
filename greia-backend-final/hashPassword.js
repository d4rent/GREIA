const bcrypt = require('bcrypt');

const plainPassword = 'Rosemary15&6980'; // Replace with the plain text password
bcrypt.hash(plainPassword, 10, (err, hash) => {
  if (err) throw err;
  console.log('Hashed Password:', hash);
});