const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const authenticateToken = require('../middlewares/auth');
const pool = require('../config/db');

// Helper function to check if user has active subscription
async function hasActiveSubscription(userId) {
  try {
    const [subscriptions] = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active" AND end_date > NOW() ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return subscriptions.length > 0;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

// Use environment variables for URLs (fallback to localhost)
const BASE_URL = process.env.BASE_URL;
const SUCCESS_URL = `${BASE_URL}/profile.html#ad-upload`;
const CANCEL_URL = `${BASE_URL}/profile.html`;

// Create Stripe Checkout Session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { packageType } = req.body; // 'basic', 'standard', or 'premium'
    
    // Define exposure package prices (in cents)
    const exposurePackages = {
      basic: { price: 10000, name: 'Basic Exposure Package (€100)' }, // €100
      standard: { price: 25000, name: 'Standard Exposure Package (€250)' }, // €250
      premium: { price: 50000, name: 'Premium Exposure Package (€500)' } // €500
    };
    
    if (!packageType || !exposurePackages[packageType]) {
      return res.status(400).json({ error: 'Invalid package type. Must be basic, standard, or premium.' });
    }
    
    // Check if user has active subscription for 50% discount
    const isSubscriber = await hasActiveSubscription(req.user.id);
    const originalAmount = exposurePackages[packageType].price;
    const discountedAmount = isSubscriber ? Math.round(originalAmount * 0.5) : originalAmount; // 50% off for subscribers
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { 
            name: isSubscriber ? `${exposurePackages[packageType].name} (50% Member Discount)` : exposurePackages[packageType].name,
            description: isSubscriber ? 'Member price - 50% discount applied' : 'Regular price'
          },
          unit_amount: discountedAmount,
        },
        quantity: 1,
      }],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      metadata: { 
        userId: req.user.id,
        packageType: packageType,
        isSubscriber: isSubscriber,
        originalAmount: originalAmount,
        discountedAmount: discountedAmount
      }
    });
    res.json({ 
      url: session.url,
      packageType,
      isSubscriber,
      originalAmount: originalAmount / 100,
      discountedAmount: discountedAmount / 100,
      savings: isSubscriber ? (originalAmount - discountedAmount) / 100 : 0
    });
  } catch (err) {
    console.error('Stripe session creation failed:', err.message);
    res.status(500).json({ error: 'Stripe session creation failed.' });
  }
});

// 1. Create Payment Intent (with subscriber discount)
router.post('/create-intent', authenticateToken, async (req, res) => {
  const { packageType, currency, description } = req.body;
  try {
    // Define exposure package prices (in cents)
    const exposurePackages = {
      basic: 10000,    // €100
      standard: 25000, // €250
      premium: 50000   // €500
    };
    
    if (!packageType || !exposurePackages[packageType]) {
      return res.status(400).json({ error: 'Invalid package type. Must be basic, standard, or premium.' });
    }
    
    // Check if user has active subscription for 50% discount
    const isSubscriber = await hasActiveSubscription(req.user.id);
    const originalAmount = exposurePackages[packageType];
    const discountedAmount = isSubscriber ? Math.round(originalAmount * 0.5) : originalAmount; // 50% off for subscribers
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: discountedAmount,
      currency: currency || 'eur',
      description: isSubscriber ? `${description || `${packageType} Exposure Package`} (50% Member Discount)` : (description || `${packageType} Exposure Package`),
      metadata: { 
        userId: req.user.id,
        packageType: packageType,
        isSubscriber: isSubscriber,
        originalAmount: originalAmount,
        discountedAmount: discountedAmount
      }
    });
    res.json({ 
      client_secret: paymentIntent.client_secret,
      packageType,
      isSubscriber,
      originalAmount: originalAmount / 100,
      discountedAmount: discountedAmount / 100,
      savings: isSubscriber ? (originalAmount - discountedAmount) / 100 : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Stripe error' });
  }
});

// Check subscription status and pricing
router.get('/pricing', authenticateToken, async (req, res) => {
  try {
    const isSubscriber = await hasActiveSubscription(req.user.id);
    
    // Define all pricing (in cents)
    const exposurePackages = {
      basic: 10000,    // €100
      standard: 25000, // €250
      premium: 50000   // €500
    };
    
    const serviceUploadFee = 1000; // €10.00
    
    const pricing = {};
    
    // Calculate pricing for each package
    Object.keys(exposurePackages).forEach(packageType => {
      const originalPrice = exposurePackages[packageType];
      const discountedPrice = isSubscriber ? Math.round(originalPrice * 0.5) : originalPrice;
      
      pricing[packageType] = {
        original: originalPrice / 100,
        current: discountedPrice / 100,
        discount: isSubscriber ? 50 : 0,
        savings: isSubscriber ? (originalPrice - discountedPrice) / 100 : 0
      };
    });
    
    // Add service upload fee (no member discount)
    pricing.serviceUpload = {
      original: serviceUploadFee / 100,
      current: serviceUploadFee / 100,
      discount: 0,
      savings: 0
    };
    
    res.json({
      isSubscriber,
      pricing
    });
  } catch (err) {
    console.error('Pricing check error:', err);
    res.status(500).json({ error: 'Failed to get pricing information' });
  }
});

// Create checkout session for service upload
router.post('/create-service-upload-session', authenticateToken, async (req, res) => {
  try {
    const serviceUploadFee = 1000; // €10.00 in cents (no member discount)
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Service Upload Fee',
              description: 'One-time fee to upload and list your service'
            },
            unit_amount: serviceUploadFee,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/dashboard/services?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/services?payment=cancelled`,
      metadata: {
        userId: req.user.id,
        paymentType: 'service_upload'
      }
    });

    res.json({ 
      url: session.url,
      sessionId: session.id,
      amount: serviceUploadFee / 100,
      currency: 'EUR'
    });
  } catch (err) {
    console.error('Service upload session creation error:', err);
    res.status(500).json({ error: 'Failed to create service upload session' });
  }
});

// Create payment intent for service upload
router.post('/create-service-upload-intent', authenticateToken, async (req, res) => {
  try {
    const serviceUploadFee = 1000; // €10.00 in cents (no member discount)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: serviceUploadFee,
      currency: 'eur',
      description: 'Service Upload Fee',
      metadata: { 
        userId: req.user.id,
        paymentType: 'service_upload'
      }
    });

    res.json({ 
      client_secret: paymentIntent.client_secret,
      amount: serviceUploadFee / 100,
      currency: 'EUR'
    });
  } catch (err) {
    console.error('Service upload payment intent error:', err);
    res.status(500).json({ error: 'Failed to create service upload payment intent' });
  }
});

// 3. Stripe Webhook
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    // TODO: Handle successful payment (update DB, etc.)
  }
  res.json({ received: true });
});

module.exports = router;