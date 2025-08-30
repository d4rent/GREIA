const pool = require('../config/db');

let ses = null;
let sesFrom = null;
try {
  const aws = require('aws-sdk');
  if (process.env.AWS_REGION && process.env.SES_FROM) {
    aws.config.update({ region: process.env.AWS_REGION });
    sesFrom = process.env.SES_FROM;
    ses = new aws.SES();
  }
} catch (e) {
  // aws-sdk not installed or misconfigured; ignore for now
}

async function notifyUser(userId, type, subject, message, extras = {}) {
  // Insert in-app notification
  await pool.query(
    'INSERT INTO notifications (user_id, type, payload, channel) VALUES (?, ?, ?, ?)',
    [userId, type, JSON.stringify({ subject, message, ...extras }), 'inapp']
  );
  // Send email if SES configured and we can find the user's email
  if (ses && sesFrom) {
    const [[u]] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
    if (u && u.email) {
      try {
        await ses.sendEmail({
          Source: sesFrom,
          Destination: { ToAddresses: [u.email] },
          Message: {
            Subject: { Data: subject },
            Body: { Text: { Data: message } }
          }
        }).promise();
        // mark delivered_at
        await pool.query('UPDATE notifications SET delivered_at = NOW(), channel = ? WHERE user_id = ? ORDER BY id DESC LIMIT 1', ['email', userId]);
      } catch (e) {
        console.warn('SES email failed', e.message);
      }
    }
  }
}

module.exports = { notifyUser };
