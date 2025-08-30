const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const authenticateToken = require('../middlewares/auth');
const pool = require('../config/db');

// Create subscription payment intent
router.post('/create-subscription-payment-intent', authenticateToken, async (req, res) => {
  const { priceId, planName } = req.body;
  
  try {
    // Create payment intent for subscription
    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceId === 'price_premium' ? 3000 : 1500, // €30.00 or €15.00
      currency: 'eur',
      description: `${planName} Subscription`,
      metadata: { 
        userId: req.user.id,
        priceId,
        planName
      }
    });

    res.json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Subscription payment intent error:', err);
    res.status(500).json({ error: 'Failed to create subscription payment intent' });
  }
});

// Create subscription after payment
router.post('/', authenticateToken, async (req, res) => {
  const { payment_intent_id, priceId, planName } = req.body;
  
  try {
    // Verify payment
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (intent.status !== 'succeeded') {
      return res.status(402).json({ error: 'Payment not completed' });
    }

    // Create subscription in database
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    await pool.query(
      `INSERT INTO subscriptions (user_id, plan_name, price_id, status, start_date, end_date, payment_intent_id) 
       VALUES (?, ?, ?, 'active', ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       plan_name = VALUES(plan_name), 
       price_id = VALUES(price_id), 
       status = VALUES(status), 
       start_date = VALUES(start_date), 
       end_date = VALUES(end_date),
       payment_intent_id = VALUES(payment_intent_id)`,
      [req.user.id, planName, priceId, startDate, endDate, payment_intent_id]
    );

    res.json({ 
      success: true, 
      subscription: { planName, status: 'active', startDate, endDate }
    });
  } catch (err) {
    console.error('Subscription creation error:', err);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Get current subscription
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const [subscriptions] = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );

    if (subscriptions.length === 0) {
      return res.json({ subscription: null, plan: 'free' });
    }

    const subscription = subscriptions[0];
    const now = new Date();
    const isActive = subscription.status === 'active' && new Date(subscription.end_date) > now;

    res.json({
      subscription: subscription,
      plan: isActive ? subscription.plan_name : 'free',
      isActive
    });
  } catch (err) {
    console.error('Get subscription error:', err);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Handle free plan
router.post('/free', authenticateToken, async (req, res) => {
  try {
    // Set user to free plan (or remove active subscription)
    await pool.query(
      'UPDATE subscriptions SET status = "cancelled" WHERE user_id = ? AND status = "active"',
      [req.user.id]
    );

    res.json({ 
      success: true, 
      plan: 'free',
      message: 'Switched to free plan'
    });
  } catch (err) {
    console.error('Free plan error:', err);
    res.status(500).json({ error: 'Failed to switch to free plan' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE subscriptions SET status = "cancelled" WHERE user_id = ? AND status = "active"',
      [req.user.id]
    );

    res.json({ 
      success: true, 
      message: 'Subscription cancelled'
    });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;
