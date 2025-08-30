const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const pool = require('../config/db');
const multer = require('multer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

// S3 client setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Multer memory storage for S3 uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Helper to upload a file to S3
// Helper to upload a file to S3
async function uploadToS3(file) {
  const fileName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
  const key = `uploads/${fileName}`; // Always use 'uploads/' folder
  const s3Upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }
  });
  await s3Upload.done();
  return key; // Return the full key with folder
}

// Helper to delete a file from S3
async function deleteFromS3(keyOrUrl) {
  if (!keyOrUrl) return;
  let key = keyOrUrl;
  if (keyOrUrl.startsWith('http')) {
    key = keyOrUrl.split('/').pop();
  }
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }));
  } catch (err) {
    if (err.name !== 'NoSuchKey') {
      console.error('Failed to delete S3 object:', err);
    }
  }
}

// Define commercial property types
const COMMERCIAL_TYPES = [
  'office',
  'restaurant/bar',
  'cafe',
  'auction',
  'agricultural site',
  'investment property',
  'development site'
];

// CREATE property
router.post(
  '/',
  authenticateToken,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'company_logo', maxCount: 1 },
    { name: 'photos', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        address,
        area,
        property_type,
        status,
        price,
        price_period,
        property_size,
        beds,
        baths,
        agency_name,
        parking,
        pet_policy,
        energy_rating,
        furnished,
        features,
        // New fields that exist in your database
        rent_price,
        deposit,
        bedrooms,
        bathrooms,
        size_sqft,
        year_built,
        city,
        county,
        eircode,
        condition,
        heating,
        garden,
        pets_allowed,
        smoking_allowed,
        available_from,
        lease_term,
        listing_type
      } = req.body;

      let image = null;
      let company_logo = null;
      let photos = null;

      if (req.files['image']) {
        image = await uploadToS3(req.files['image'][0]);
      }
      if (req.files['company_logo']) {
        company_logo = await uploadToS3(req.files['company_logo'][0]);
      }
      if (req.files['photos']) {
        const photoKeys = [];
        for (const file of req.files['photos']) {
          const key = await uploadToS3(file);
          photoKeys.push(key);
        }
        photos = JSON.stringify(photoKeys);
      }

      // Convert numeric fields to proper types
      const bedroomsValue = bedrooms || beds;
      const bathroomsValue = bathrooms || baths;
      const yearBuiltValue = year_built;
      
      const [result] = await pool.query(
        `INSERT INTO properties 
          (user_id, title, description, address, area, property_type, status, price, price_period, bedrooms, bathrooms, agency_name, parking, pets_allowed, energy_rating, furnished, image, company_logo, photos, features, rent_price, deposit, size_sqft, year_built, city, county, eircode, \`condition\`, heating, garden, smoking_allowed, available_from, lease_term, listing_type, workflow_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          req.user.id,
          title,
          description,
          address,
          area,
          property_type,
          status,
          price,
          price_period,
          bedroomsValue ? parseInt(bedroomsValue) : null,
          bathroomsValue ? parseInt(bathroomsValue) : null,
          agency_name,
          parking,
          pets_allowed || pet_policy || null,
          energy_rating,
          furnished,
          image,
          company_logo,
          photos,
          features || null,
          rent_price || null,
          deposit || null,
          size_sqft || property_size || null,
          yearBuiltValue ? parseInt(yearBuiltValue) : null,
          city || null,
          county || null,
          eircode || null,
          condition || null,
          heating || null,
          garden || null,
          smoking_allowed || null,
          available_from || null,
          lease_term || null,
          listing_type || null
        ]
      );

      res.json({ 
        success: true, 
        message: 'Property submitted for review. It will be published once approved by our team.',
        propertyId: result.insertId
      });
    } catch (err) {
      console.error('Property creation error:', err);
      console.error('Request body received:', req.body);
      console.error('Request files received:', req.files);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        errno: err.errno,
        sqlMessage: err.sqlMessage,
        sqlState: err.sqlState
      });
      res.status(500).json({ error: 'Property upload failed.', details: err.message });
    }
  }
);

// GET all properties for the logged-in user (shows all workflow statuses)
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM properties WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    rows.forEach(row => {
      if (row.image) row.image = `${process.env.CLOUDFRONT_URL}/${row.image}`;
      if (row.company_logo) row.company_logo = `${process.env.CLOUDFRONT_URL}/${row.company_logo}`;
      if (row.photos) {
        try {
          const arr = JSON.parse(row.photos);
          row.photos = arr.map(photo => `${process.env.CLOUDFRONT_URL}/${photo}`);
        } catch {
          row.photos = [];
        }
      }
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch properties.' });
  }
});

// GET all properties for the logged-in user (with workflow status info)
router.get('/my-properties', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, 
              CASE 
                WHEN p.workflow_status = 'pending' THEN 'Pending Review'
                WHEN p.workflow_status = 'approved' THEN 'Live'
                WHEN p.workflow_status = 'rejected' THEN 'Rejected'
                ELSE p.workflow_status
              END as status_display
       FROM properties p 
       WHERE p.user_id = ? 
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    rows.forEach(row => {
      if (row.image) row.image = `${process.env.CLOUDFRONT_URL}/${row.image}`;
      if (row.company_logo) row.company_logo = `${process.env.CLOUDFRONT_URL}/${row.company_logo}`;
      if (row.photos) {
        try {
          const arr = JSON.parse(row.photos);
          row.photos = arr.map(photo => `${process.env.CLOUDFRONT_URL}/${photo}`);
        } catch {
          row.photos = [];
        }
      }
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch properties.' });
  }
});

// GET a single property by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         p.*, 
         u.full_name AS user_name, 
         u.profile_picture AS user_photo, 
         u.email AS user_email, 
         u.phone_number AS user_phone, 
         u.bio AS user_bio 
       FROM properties p 
       LEFT JOIN users u ON p.user_id = u.id 
       WHERE p.id = ? AND p.workflow_status = 'approved'`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    // Parse photos field and add CloudFront URLs
    if (rows[0].image) rows[0].image = `${process.env.CLOUDFRONT_URL}/${rows[0].image}`;
    if (rows[0].company_logo) rows[0].company_logo = `${process.env.CLOUDFRONT_URL}/${rows[0].company_logo}`;
    if (rows[0].photos) {
      try {
        const arr = JSON.parse(rows[0].photos);
        rows[0].photos = arr.map(photo => `${process.env.CLOUDFRONT_URL}/${photo}`);
      } catch {
        rows[0].photos = [];
      }
    }

    res.json(rows[0]); // Return the property with user details
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch property.' });
  }
});

// UPDATE property (including images/photos)
router.put(
  '/:id',
  authenticateToken,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'company_logo', maxCount: 1 },
    { name: 'photos', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM properties WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id]
      );
      if (!rows.length) {
        return res.status(404).json({ error: 'Property not found or not authorized.' });
      }
      const current = rows[0];

      // Handle file updates
      let image = current.image;
      let company_logo = current.company_logo;
      let photos = current.photos ? JSON.parse(current.photos) : [];

      if (req.files['image']) {
        // Delete old image from S3
        if (image) await deleteFromS3(image);
        image = await uploadToS3(req.files['image'][0]);
      }
      if (req.files['company_logo']) {
        if (company_logo) await deleteFromS3(company_logo);
        company_logo = await uploadToS3(req.files['company_logo'][0]);
      }
      if (req.files['photos']) {
        // Delete old photos from S3
        if (Array.isArray(photos)) {
          for (const photo of photos) await deleteFromS3(photo);
        }
        const newPhotos = [];
        for (const file of req.files['photos']) {
          const key = await uploadToS3(file);
          newPhotos.push(key);
        }
        photos = newPhotos;
      }

      // Update all fields to match the actual database schema
      const {
        title = current.title,
        description = current.description,
        address = current.address,
        area = current.area,
        property_type = current.property_type,
        status = current.status,
        price = current.price,
        price_period = current.price_period,
        property_size = current.property_size,
        beds = current.beds,
        baths = current.baths,
        agency_name = current.agency_name,
        parking = current.parking,
        pet_policy = current.pet_policy,
        energy_rating = current.energy_rating,
        furnished = current.furnished,
        features = current.features,
        // New fields that exist in your database
        rent_price = current.rent_price,
        deposit = current.deposit,
        bedrooms = current.bedrooms,
        bathrooms = current.bathrooms,
        size_sqft = current.size_sqft,
        year_built = current.year_built,
        city = current.city,
        county = current.county,
        eircode = current.eircode,
        condition = current.condition,
        heating = current.heating,
        garden = current.garden,
        pets_allowed = current.pets_allowed,
        smoking_allowed = current.smoking_allowed,
        available_from = current.available_from,
        lease_term = current.lease_term,
        listing_type = current.listing_type
      } = req.body;

      // Map beds/bedrooms and baths/bathrooms if needed
      const finalBeds = bedrooms || beds;
      const finalBaths = bathrooms || baths;
      const finalBedrooms = bedrooms || beds;
      const finalBathrooms = bathrooms || baths;

      console.log('Updating property with data:', {
        title, description, address, area, property_type, status, price, price_period,
        property_size, beds: finalBeds, baths: finalBaths, agency_name, parking, pet_policy, energy_rating,
        furnished, features, rent_price, deposit, bedrooms: finalBedrooms, bathrooms: finalBathrooms, size_sqft, 
        year_built, city, county, eircode, condition, heating, garden, pets_allowed,
        smoking_allowed, available_from, lease_term, listing_type, image, company_logo, 
        photos: JSON.stringify(photos)
      });

      const [result] = await pool.query(
        `UPDATE properties SET 
          title = ?, 
          description = ?, 
          address = ?, 
          area = ?,
          property_type = ?, 
          status = ?, 
          price = ?, 
          price_period = ?,
          property_size = ?, 
          beds = ?,
          baths = ?,
          agency_name = ?,
          parking = ?,
          pet_policy = ?,
          energy_rating = ?,
          furnished = ?,
          image = ?, 
          company_logo = ?, 
          photos = ?,
          features = ?,
          rent_price = ?,
          deposit = ?,
          bedrooms = ?,
          bathrooms = ?,
          size_sqft = ?,
          year_built = ?,
          city = ?,
          county = ?,
          eircode = ?,
          \`condition\` = ?,
          heating = ?,
          garden = ?,
          pets_allowed = ?,
          smoking_allowed = ?,
          available_from = ?,
          lease_term = ?,
          listing_type = ?
        WHERE id = ? AND user_id = ?`,
        [
          title,
          description,
          address,
          area,
          property_type,
          status,
          price,
          price_period,
          property_size,
          finalBeds,
          finalBaths,
          agency_name,
          parking,
          pet_policy,
          energy_rating,
          furnished,
          image,
          company_logo,
          JSON.stringify(photos),
          features,
          rent_price,
          deposit,
          finalBedrooms,
          finalBathrooms,
          size_sqft,
          year_built,
          city,
          county,
          eircode,
          condition,
          heating,
          garden,
          pets_allowed,
          smoking_allowed,
          available_from,
          lease_term,
          listing_type,
          req.params.id,
          req.user.id
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Property not found or not authorized.' });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Property update error:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        errno: err.errno,
        sqlMessage: err.sqlMessage,
        sqlState: err.sqlState
      });
      res.status(500).json({ error: 'Property update failed.', details: err.message });
    }
  }
);

// DELETE property (also deletes images from S3)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Get property to delete images
    const [rows] = await pool.query(
      'SELECT image, company_logo, photos FROM properties WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Property not found or not authorized.' });
    }
    const { image, company_logo, photos } = rows[0];

    // Delete property from DB
    const [result] = await pool.query(
      'DELETE FROM properties WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Property not found or not authorized.' });
    }

    // Delete files from S3
    if (image) await deleteFromS3(image);
    if (company_logo) await deleteFromS3(company_logo);
    if (photos) {
      try {
        const photoArr = JSON.parse(photos);
        if (Array.isArray(photoArr)) {
          for (const photo of photoArr) await deleteFromS3(photo);
        }
      } catch {}
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Property deletion failed.' });
  }
});

// GET all properties (public, with filtering)
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT 
        p.*, 
        u.full_name AS user_name
      FROM properties p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.workflow_status = 'approved'
    `;
    const params = [];

    if (req.query.type) {
      sql += ' AND LOWER(TRIM(p.property_type)) = ?';
      params.push(req.query.type.trim().toLowerCase());
    }

    if (req.query.price) {
      const [min, max] = req.query.price.split('-');
      if (min && max) {
        sql += ' AND p.price BETWEEN ? AND ?';
        params.push(Number(min), Number(max));
      } else if (min && !max) {
        sql += ' AND p.price >= ?';
        params.push(Number(min));
      }
    }

    if (req.query.size) {
      const [min, max] = req.query.size.split('-');
      if (min && max) {
        sql += ' AND p.property_size BETWEEN ? AND ?';
        params.push(Number(min), Number(max));
      } else if (min && !max) {
        sql += ' AND p.property_size >= ?';
        params.push(Number(min));
      }
    }

    if (req.query.beds) {
      if (req.query.beds.endsWith('+')) {
        const minBeds = parseInt(req.query.beds);
        sql += ' AND p.beds >= ?';
        params.push(minBeds);
      } else {
        sql += ' AND p.beds = ?';
        params.push(Number(req.query.beds));
      }
    }

    if (req.query.status) {
      sql += ' AND p.status = ?';
      params.push(req.query.status);
    }

    // Add support for "commercial" filter
    if (req.query.commercial === 'true') {
      sql += ` AND LOWER(TRIM(p.property_type)) IN (${COMMERCIAL_TYPES.map(() => '?').join(',')})`;
      params.push(...COMMERCIAL_TYPES.map(t => t.toLowerCase()));
    } else if (req.query.commercial === 'false') {
      sql += ` AND LOWER(TRIM(p.property_type)) NOT IN (${COMMERCIAL_TYPES.map(() => '?').join(',')})`;
      params.push(...COMMERCIAL_TYPES.map(t => t.toLowerCase()));
    }

    sql += ' ORDER BY p.created_at DESC';

    const [rows] = await pool.query(sql, params);
    rows.forEach(row => {
      if (row.image) row.image = `${process.env.CLOUDFRONT_URL}/${row.image}`;
      if (row.company_logo) row.company_logo = `${process.env.CLOUDFRONT_URL}/${row.company_logo}`;
      if (row.photos) {
        try {
          const arr = JSON.parse(row.photos);
          row.photos = arr.map(photo => `${process.env.CLOUDFRONT_URL}/${photo}`);
        } catch {
          row.photos = [];
        }
      }
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch properties.' });
  }
});

// GET saved (favourite) properties for the logged-in user
router.get('/saved', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*
       FROM properties p
       INNER JOIN favourites f ON f.item_id = p.id
       WHERE f.user_id = ? AND f.item_type = 'property' AND p.workflow_status = 'approved'
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    rows.forEach(row => {
      if (row.image) row.image = `${process.env.CLOUDFRONT_URL}/${row.image}`;
      if (row.company_logo) row.company_logo = `${process.env.CLOUDFRONT_URL}/${row.company_logo}`;
      if (row.photos) {
        try {
          const arr = JSON.parse(row.photos);
          row.photos = arr.map(photo => `${process.env.CLOUDFRONT_URL}/${photo}`);
        } catch {
          row.photos = [];
        }
      }
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch saved properties.' });
  }
});

// Track property views
router.post('/:id/view', async (req, res) => {
  try {
    await pool.query(
      'UPDATE properties SET views = IFNULL(views,0) + 1 WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record property view.' });
  }
});

module.exports = router;