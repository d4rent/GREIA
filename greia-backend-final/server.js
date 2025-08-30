require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const pool = require('./config/db');

const authenticateToken = require('./middlewares/auth');

const app = express();
const crmRouter = require('./routes/crm');
const referralsRouter = require('./routes/referrals');
const contractsRouter = require('./routes/contracts');
const marketplaceRouter = require('./routes/marketplace');

const conversationsRouter = require('./routes/conversations');
const messagesRouter = require('./routes/messages');


// --- CORS middleware: place this before any routes ---
app.use(cors({
app.use('/api/crm', authenticateToken, crmRouter);

app.use('/api/marketplace', authenticateToken, marketplaceRouter);

  origin: [
    'https://d4rent.ie',
    'http://d4rent.ie',
    'https://www.d4rent.ie',
    'http://www.d4rent.ie',
    'https://api.d4rent.ie',
    'http://localhost:5000',
    'http://d4rent.ie.s3-website-eu-west-1.amazonaws.com'
  ],
  credentials: true
}));


app.use('/api/conversations', authenticateToken, conversationsRouter);
app.use('/api/messages', authenticateToken, messagesRouter);
app.use(express.json());

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for OAuth to work across HTTP/HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Allow cross-site requests for OAuth
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport session serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, users[0]);
  } catch (error) {
    done(error, null);
  }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '/frontend/public')));
// The following line serves local files from /uploads, but you are using S3 for uploads.
// It is harmless, but not needed unless you store files locally.
// You can remove this line if you never store images locally:
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const propertiesRoutes = require('./routes/properties');
const advertisementsRoutes = require('./routes/advertisements');
const servicesRoutes = require('./routes/services');
const authRoutes = require('./routes/auth');
const agentsRoutes = require('./routes/users');
const favouritesRoutes = require('./routes/favourites');
const tagsRoutes = require('./routes/tags');
const userTagsRoutes = require('./routes/user_tags');
const chatbotRouter = require('./routes/chatbot');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const subscriptionsRoutes = require('./routes/subscriptions');
// New verification routes
const emailVerificationRoutes = require('./routes/emailVerification');
const googleAuthRoutes = require('./routes/googleAuth');



// API routes
app.use('/api/properties', propertiesRoutes);
app.use('/api/advertisements', advertisementsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', agentsRoutes);
app.use('/api/favourites', favouritesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/user_tags', userTagsRoutes);
app.use('/api/chatbot', chatbotRouter);
app.use('/api/valuation', require('./routes/valuation'));
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
// Verification routes
app.use('/api/verify', emailVerificationRoutes);
app.use('/api/auth', googleAuthRoutes);

// Log database connection status on startup
pool.getConnection()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection failed:', err));

// Health check route
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1');
    res.json({ success: true, result: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// === GREIA: Moderation queues ===
app.get('/api/admin/moderation/marketplace', requireAdmin, async (req,res)=>{
  try{
    const [rows] = await pool.query(`SELECT mp.id, mp.property_id, mp.status, p.title, u.full_name AS owner
                                       FROM marketplace_posts mp
                                       JOIN properties p ON p.id=mp.property_id
                                       JOIN users u ON u.id=mp.owner_user_id
                                      WHERE mp.status IN ('paused','pending') OR mp.status IS NULL
                                      ORDER BY mp.id DESC`);
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});
app.post('/api/admin/moderation/marketplace/:id/approve', requireAdmin, async (req,res)=>{
  try{ const { id } = req.params; await pool.query(`UPDATE marketplace_posts SET status='active' WHERE id=?`, [id]); res.json({approved:true}); }
  catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});
app.post('/api/admin/moderation/marketplace/:id/reject', requireAdmin, async (req,res)=>{
  try{ const { id } = req.params; await pool.query(`UPDATE marketplace_posts SET status='closed' WHERE id=?`, [id]); res.json({rejected:true}); }
  catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});
app.get('/api/admin/moderation/ads', requireAdmin, async (req,res)=>{
  try{
    let rows = [];
    try{
      const [r1] = await pool.query(`SELECT id, campaign_id, placement, media_url, 'ad_creatives' AS model FROM ad_creatives WHERE status='pending' ORDER BY id DESC`);
      rows = r1;
    }catch(e){}
    if (!rows.length) {
      try{
        const [r2] = await pool.query(`SELECT id, placement, image_url AS media_url, 'advertisements' AS model FROM advertisements WHERE status='pending' ORDER BY id DESC`);
        rows = r2;
      }catch(e){}
    }
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});
app.post('/api/admin/moderation/ads/:model/:id/approve', requireAdmin, async (req,res)=>{
  try{
    const { model, id } = req.params;
    if (model === 'ad_creatives') await pool.query(`UPDATE ad_creatives SET status='active' WHERE id=?`, [id]);
    else await pool.query(`UPDATE advertisements SET status='active' WHERE id=?`, [id]);
    res.json({approved:true});
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});
app.post('/api/admin/moderation/ads/:model/:id/reject', requireAdmin, async (req,res)=>{
  try{
    const { model, id } = req.params;
    if (model === 'ad_creatives') await pool.query(`UPDATE ad_creatives SET status='rejected' WHERE id=?`, [id]);
    else await pool.query(`UPDATE advertisements SET status='rejected' WHERE id=?`, [id]);
    res.json({rejected:true});
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});


// === GREIA: Company public API with slug ===
function slugify(str){
  return String(str||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
app.get('/api/public/companies', async (req,res)=>{
  try{
    const [rows] = await pool.query(`SELECT company AS name, COUNT(*) AS members FROM users WHERE company IS NOT NULL AND company<>'' GROUP BY company ORDER BY members DESC`);
    res.json(rows.map(r=>({ slug: slugify(r.name), name: r.name, members: r.members })));
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});
app.get('/api/public/companies/:slug', async (req,res)=>{
  try{
    const slug = req.params.slug;
    const [rows] = await pool.query(`SELECT DISTINCT company FROM users WHERE company IS NOT NULL AND company<>''`);
    const match = rows.find(r => slugify(r.company) === slug);
    if(!match) return res.status(404).json({message:'Company not found'});
    const [members] = await pool.query(`SELECT id, full_name, title, location, profile_picture FROM users WHERE company=? ORDER BY full_name ASC`, [match.company]);
    res.json({ slug, name: match.company, members });
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});


// === GREIA: Saved Search Daily Digest (admin-triggered) ===
app.post('/api/admin/run-digest', requireAdmin, async (req, res) => {
  try {
    const sinceHours = Number(req.query.hours || 24);
    const [searches] = await pool.query(`SELECT * FROM saved_searches`);
    const awssdk = require('aws-sdk');
    if (process.env.AWS_REGION && process.env.SES_FROM) awssdk.config.update({ region: process.env.AWS_REGION });
    const ses = (process.env.AWS_REGION && process.env.SES_FROM) ? new awssdk.SES() : null;

    let totalEmails = 0;
    for (const s of searches) {
      const [urows] = await pool.query('SELECT email, base_lat, base_lng, service_radius_km FROM users WHERE id=?', [s.user_id]);
      if (!urows.length) continue;
      const user = urows[0];
      const crit = JSON.parse(s.criteria_json || '{}');
      let items = [];
      if (s.scope === 'marketplace') {
        const radiusKm = crit.radius_km || user.service_radius_km || 10;
        const [rows] = await pool.query(
          `SELECT mp.*, p.title, p.lat, p.lng
             FROM marketplace_posts mp
             JOIN properties p ON p.id = mp.property_id
            WHERE mp.status='active'
              AND mp.active_from >= DATE_SUB(NOW(), INTERVAL ? HOUR)
              AND p.lat IS NOT NULL AND p.lng IS NOT NULL
              AND (
                6371 * 2 * ASIN(
                  SQRT(
                    POWER(SIN(RADIANS(p.lat - ? ) / 2), 2) +
                    COS(RADIANS(?) ) * COS(RADIANS(p.lat)) *
                    POWER(SIN(RADIANS(p.lng - ? ) / 2), 2)
                  )
                )
              ) <= ?`,
          [sinceHours, user.base_lat, user.base_lat, user.base_lng, radiusKm]
        );
        items = rows;
      } else if (s.scope === 'connect') {
        const { q, city, company, language } = crit;
        const where = ["role='property_agent'"];
        const params = [];
        if (city) { where.push("location LIKE ?"); params.push('%'+city+'%'); }
        if (language) { where.push("FIND_IN_SET(?, REPLACE(languages_spoken, ' ', '')) > 0"); params.push(language); }
        if (company) { where.push("company = ?"); params.push(company); }
        if (q) { where.push("(full_name LIKE ? OR email LIKE ?)"); params.push('%'+q+'%', '%'+q+'%'); }
        where.push("approved=1");
        const [rows] = await pool.query(
          `SELECT id, full_name, email, company, location FROM users WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT 50`,
          params
        );
        items = rows;
      }
      if (items.length && ses && user.email) {
        const subject = s.scope === 'marketplace' ? `Marketplace digest: ${items.length} new near you` : `GREIAconnect digest: ${items.length} matches`;
        const lines = items.slice(0,10).map(it => (it.title ? `- ${it.title}` : `- ${it.full_name||it.email||'Agent'}`)).join('\n');
        const params = {
          Source: process.env.SES_FROM,
          Destination: { ToAddresses: [user.email] },
          Message: { Subject: { Data: subject }, Body: { Text: { Data: `${lines}\n\nVisit GREIA to view.` } } }
        };
        try { await ses.sendEmail(params).promise(); totalEmails++; } catch(e) { console.error('SES digest error', e.message); }
      }
    }
    res.json({ ok: true, total_searches: searches.length, emails_sent: totalEmails });
  } catch (e) { console.error('run-digest error', e); res.status(500).json({ message: 'Server error' }); }
});


// === GREIA: News ===
app.get('/api/news', async (req,res)=>{
  try{
    const [rows] = await pool.query(`SELECT id, title, author, published_at FROM articles ORDER BY published_at DESC LIMIT 100`);
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});
app.get('/api/news/:id', async (req,res)=>{
  try{
    const { id } = req.params;
    const [rows] = await pool.query(`SELECT id, title, body_html, author, published_at FROM articles WHERE id=?`, [id]);
    if(!rows.length) return res.status(404).json({message:'Not found'});
    res.json(rows[0]);
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});
app.post('/api/admin/news', requireAdmin, express.json(), async (req,res)=>{
  try{
    const { title, body_html, author, source_id, tags } = req.body || {};
    if(!title) return res.status(400).json({message:'title required'});
    const [r] = await pool.query(`INSERT INTO articles (source_id, title, body_html, author, tags, published_at, created_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                                 [source_id||null, title, body_html||'', author||'', tags||null]);
    res.status(201).json({ id: r.insertId });
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});


// === GREIA: Self-serve Ads (basic) ===
app.post('/api/ads/campaigns', express.json(), async (req,res)=>{
  try{
    if(!req.user || !req.user.id) return res.status(401).json({message:'Please log in.'});
    const { name, objective } = req.body || {};
    if(!name) return res.status(400).json({message:'name required'});
    const [r] = await pool.query(`INSERT INTO ad_campaigns (advertiser_user_id, name, objective, status, created_at) VALUES (?, ?, ?, 'draft', NOW())`, [req.user.id, name, objective||'traffic']);
    res.status(201).json({ id: r.insertId });
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});

app.post('/api/ads/creatives', express.json(), async (req,res)=>{
  try{
    if(!req.user || !req.user.id) return res.status(401).json({message:'Please log in.'});
    const { campaign_id, placement, media_url, click_url } = req.body || {};
    if(!campaign_id || !placement || !media_url || !click_url) return res.status(400).json({message:'campaign_id, placement, media_url, click_url required'});
    const [r] = await pool.query(`INSERT INTO ad_creatives (campaign_id, placement, media_url, click_url, created_at, status) VALUES (?, ?, ?, ?, NOW(), 'pending')`,
                                 [campaign_id, placement, media_url, click_url]);
    res.status(201).json({ id: r.insertId });
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});

// Track impressions/clicks (front-end will ping these)
app.post('/api/ads/:creativeId/impression', async (req,res)=>{
  try{ const id = req.params.creativeId; await pool.query(`INSERT INTO ad_impressions (creative_id, created_at) VALUES (?, NOW())`, [id]); res.json({ok:true}); }
  catch(e){ res.status(500).json({message:'Server error'}) }
});
app.post('/api/ads/:creativeId/click', async (req,res)=>{
  try{ const id = req.params.creativeId; await pool.query(`INSERT INTO ad_clicks (creative_id, created_at) VALUES (?, NOW())`, [id]); res.json({ok:true}); }
  catch(e){ res.status(500).json({message:'Server error'}) }
});


// === GREIA: Exposure Packages ===
app.post('/api/exposure/checkout', express.json(), async (req,res)=>{
  try{
    if(!req.user || !req.user.id) return res.status(401).json({message:'Please log in.'});
    if(!stripe) return res.status(500).json({message:'Stripe not configured'});
    const { listing_type, listing_id, package } = req.body || {}; // e.g., 'property', 123, 'homepage-7d'
    if(!listing_type || !listing_id || !package) return res.status(400).json({message:'listing_type, listing_id, package required'});
    const priceId = process.env['STRIPE_PRICE_ID_EXPOSURE_'+String(package).replace(/[^A-Z0-9]/gi,'_').toUpperCase()];
    if(!priceId) return res.status(400).json({message:'Price not configured for package: '+package});
    const origin = process.env.FRONTEND_ORIGIN || req.headers.origin || '';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: origin + '/pages/profile-properties.html?boosted=1',
      cancel_url: origin + '/pages/profile-properties.html?canceled=1',
      metadata: { user_id: String(req.user.id), listing_type, listing_id: String(listing_id), package }
    });
    res.json({ url: session.url });
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});

// Extend Stripe webhook to handle exposure orders
// (This block assumes existing /api/webhooks/stripe route; append additional cases below handling.)


// === GREIA: Referrals ===
app.post('/api/referrals', express.json(), async (req,res)=>{
  try{
    if(!req.user || !req.user.id) return res.status(401).json({message:'Please log in.'});
    const { to_user_id, note, conversation_id } = req.body || {};
    if(!to_user_id) return res.status(400).json({message:'to_user_id required'});
    const [r] = await pool.query(`INSERT INTO referrals (from_user_id, to_user_id, note, created_at) VALUES (?, ?, ?, NOW())`,
                                 [req.user.id, to_user_id, String(note||'').slice(0,1000)]);
    if(conversation_id){
      await pool.query(`INSERT INTO messages (conversation_id, sender_id, body, attachments, created_at) VALUES (?, ?, ?, ?, NOW())`,
                       [conversation_id, req.user.id, 'Referral created.', JSON.stringify({referral_id: r.insertId})]);
    }
    res.status(201).json({ id: r.insertId });
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});


// === GREIA: Contracts (S3 presigned upload + attach to thread) ===
const S3 = require('aws-sdk/clients/s3');
function getS3(){
  if(!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) return null;
  return new S3({ region: process.env.AWS_REGION });
}

// Create contract record and return presigned URL for direct upload
app.post('/api/contracts', express.json(), async (req,res)=>{
  try{
    if(!req.user || !req.user.id) return res.status(401).json({message:'Please log in.'});
    const { title } = req.body || {};
    if(!title) return res.status(400).json({message:'title required'});
    const s3 = getS3(); if(!s3) return res.status(500).json({message:'S3 not configured'});
    const key = `contracts/${req.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    const bucket = process.env.AWS_S3_BUCKET;
    const params = { Bucket: bucket, Key: key, Expires: 300, ContentType: 'application/pdf' };
    const url = s3.getSignedUrl('putObject', params);
    const [r] = await pool.query(`INSERT INTO contracts (title, owner_user_id, s3_key, status, created_at) VALUES (?, ?, ?, 'draft', NOW())`, [title, req.user.id, key]);
    res.json({ id: r.insertId, upload_url: url, s3_key: key });
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});

// Attach contract to conversation and mark as sent
app.post('/api/contracts/:id/send', express.json(), async (req,res)=>{
  try{
    if(!req.user || !req.user.id) return res.status(401).json({message:'Please log in.'});
    const { id } = req.params;
    const { conversation_id } = req.body || {};
    if(!conversation_id) return res.status(400).json({message:'conversation_id required'});
    const [rows] = await pool.query(`SELECT owner_user_id FROM contracts WHERE id=?`, [id]);
    if(!rows.length) return res.status(404).json({message:'Contract not found'});
    if(rows[0].owner_user_id !== req.user.id) return res.status(403).json({message:'Not owner of contract'});
    await pool.query(`UPDATE contracts SET conversation_id=?, status='sent' WHERE id=?`, [conversation_id, id]);
    // drop a message into the thread
    await pool.query(`INSERT INTO messages (conversation_id, sender_id, body, attachments, created_at) VALUES (?, ?, ?, ?, NOW())`,
                     [conversation_id, req.user.id, 'Contract sent.', JSON.stringify({contract_id: id})]);
    res.json({sent:true});
  }catch(e){ console.error(e); res.status(500).json({message:'Server error'}); }
});

// Root route
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 8080; // Use 8080 for AWS Elastic Beanstalk Node.js environments
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// === GREIA: EB Cron Task endpoint (daily digest) ===
app.post('/_tasks/run-digest', async (req, res) => {
  try {
    const token = req.headers['x-cron-token'] || req.query.token;
    if (!process.env.CRON_TOKEN || token !== process.env.CRON_TOKEN) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // Reuse admin digest logic (24h)
    req.query.hours = '24';
    // call the same handler as /api/admin/run-digest programmatically
    const fakeReq = { ...req, query: { hours: '24' }, user: { id: 0, role: 'admin' } };
    const fakeRes = {
      status: (c)=>({ json: (d)=>res.status(c).json(d) }),
      json: (d)=>res.json(d)
    };
    // Invoke the function by reaching the DB and sending SES from here
    try {
      const sinceHours = Number(24);
      const [searches] = await pool.query(`SELECT * FROM saved_searches`);
      const awssdk = require('aws-sdk');
      if (process.env.AWS_REGION && process.env.SES_FROM) awssdk.config.update({ region: process.env.AWS_REGION });
      const ses = (process.env.AWS_REGION && process.env.SES_FROM) ? new awssdk.SES() : null;

      let totalEmails = 0;
      for (const s of searches) {
        const [urows] = await pool.query('SELECT email, base_lat, base_lng, service_radius_km FROM users WHERE id=?', [s.user_id]);
        if (!urows.length) continue;
        const user = urows[0];
        const crit = JSON.parse(s.criteria_json || '{}');
        let items = [];
        if (s.scope === 'marketplace') {
          const radiusKm = crit.radius_km || user.service_radius_km || 10;
          const [rows] = await pool.query(
            `SELECT mp.*, p.title, p.lat, p.lng
               FROM marketplace_posts mp
               JOIN properties p ON p.id = mp.property_id
              WHERE mp.status='active'
                AND mp.active_from >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                AND p.lat IS NOT NULL AND p.lng IS NOT NULL
                AND (
                  6371 * 2 * ASIN(
                    SQRT(
                      POWER(SIN(RADIANS(p.lat - ? ) / 2), 2) +
                      COS(RADIANS(?) ) * COS(RADIANS(p.lat)) *
                      POWER(SIN(RADIANS(p.lng - ? ) / 2), 2)
                    )
                  )
                ) <= ?`,
            [sinceHours, user.base_lat, user.base_lat, user.base_lng, radiusKm]
          );
          items = rows;
        } else if (s.scope === 'connect') {
          const { q, city, company, language } = crit;
          const where = ["role='property_agent'"];
          const params = [];
          if (city) { where.push("location LIKE ?"); params.push('%'+city+'%'); }
          if (language) { where.push("FIND_IN_SET(?, REPLACE(languages_spoken, ' ', '')) > 0"); params.push(language); }
          if (company) { where.push("company = ?"); params.push(company); }
          if (q) { where.push("(full_name LIKE ? OR email LIKE ?)"); params.push('%'+q+'%', '%'+q+'%'); }
          where.push("approved=1");
          const [rows] = await pool.query(
            `SELECT id, full_name, email, company, location FROM users WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT 50`,
            params
          );
          items = rows;
        }
        if (items.length && ses && user.email) {
          const subject = s.scope === 'marketplace' ? `Marketplace digest: ${items.length} new near you` : `GREIAconnect digest: ${items.length} matches`;
          const lines = items.slice(0,10).map(it => (it.title ? `- ${it.title}` : `- ${it.full_name||it.email||'Agent'}`)).join('\n');
          const params = {
            Source: process.env.SES_FROM,
            Destination: { ToAddresses: [user.email] },
            Message: { Subject: { Data: subject }, Body: { Text: { Data: `${lines}\n\nVisit GREIA to view.` } } }
          };
          try { await ses.sendEmail(params).promise(); totalEmails++; } catch(e) { console.error('SES digest error', e.message); }
        }
      }
      return res.json({ ok: true, total_searches: searches.length, emails_sent: totalEmails });
    } catch (err) {
      console.error('Cron digest error', err);
      return res.status(500).json({ message: 'Server error' });
    }
  } catch (e) {
    console.error('/_tasks/run-digest error', e);
    res.status(500).json({ message: 'Server error' });
  }
});
