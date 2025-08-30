const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middlewares/auth');
const adminAuth = require('../middlewares/adminAuth');

// Apply authentication and admin authorization to all admin routes
router.use(auth);
router.use(adminAuth);

// Get admin statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total users count
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    
    // Get live properties count (approved properties)
    const [propertyCount] = await pool.query(
      'SELECT COUNT(*) as count FROM properties WHERE workflow_status = "approved"'
    );
    
    // Get active services count
    const [serviceCount] = await pool.query(
      'SELECT COUNT(*) as count FROM services WHERE status = "active"'
    );
    
    // Get active advertisements count
    const [adCount] = await pool.query(
      'SELECT COUNT(*) as count FROM advertisements WHERE status = "active"'
    );
    
    // Get pending approvals count
    const [pendingProperties] = await pool.query(
      'SELECT COUNT(*) as count FROM properties WHERE workflow_status = "pending"'
    );
    const [pendingServices] = await pool.query(
      'SELECT COUNT(*) as count FROM services WHERE status = "pending"'
    );
    const [pendingAds] = await pool.query(
      'SELECT COUNT(*) as count FROM advertisements WHERE status = "pending"'
    );
    
    const totalPending = pendingProperties[0].count + pendingServices[0].count + pendingAds[0].count;
    
    res.json({
      totalUsers: userCount[0].count,
      liveProperties: propertyCount[0].count,
      activeServices: serviceCount[0].count,
      activeAds: adCount[0].count,
      pendingApprovals: totalPending
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    console.log('Admin users endpoint accessed by:', req.user?.email);
    const [users] = await pool.query(`
      SELECT 
        id, 
        full_name, 
        email, 
        phone_number, 
        role, 
        company, 
        created_at,
        CASE 
          WHEN last_login > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'active'
          ELSE 'inactive'
        END as status
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`Returning ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Get all properties (live)
router.get('/properties', async (req, res) => {
  try {
    const [properties] = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.address,
        p.property_type,
        p.price,
        p.status,
        p.created_at,
        u.full_name as user_name
      FROM properties p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.status IN ('active', 'available', 'to let', 'for sale')
      ORDER BY p.created_at DESC
    `);
    
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get all services (active)
router.get('/services', async (req, res) => {
  try {
    const [services] = await pool.query(`
      SELECT 
        s.id,
        s.name,
        s.category,
        s.price_range,
        s.status,
        s.created_at,
        u.full_name as user_name
      FROM services s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
    `);
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get all advertisements (active)
router.get('/advertisements', async (req, res) => {
  try {
    const [advertisements] = await pool.query(`
      SELECT 
        a.id,
        a.title,
        a.category,
        a.price,
        a.status,
        a.created_at,
        u.full_name as user_name
      FROM advertisements a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.status = 'approved'
      ORDER BY a.created_at DESC
    `);
    
    res.json(advertisements);
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    res.status(500).json({ error: 'Failed to fetch advertisements' });
  }
});

// Get pending properties for approval
router.get('/pending-properties', async (req, res) => {
  try {
    const [properties] = await pool.query(`
      SELECT 
        p.*, 
        u.full_name, 
        u.email,
        u.role
      FROM properties p
      JOIN users u ON p.user_id = u.id
      WHERE p.workflow_status = 'pending'
      ORDER BY p.created_at ASC
    `);
    
    res.json(properties);
  } catch (error) {
    console.error('Error fetching pending properties:', error);
    res.status(500).json({ error: 'Failed to fetch pending properties' });
  }
});

// Get all properties with their approval status
router.get('/properties', async (req, res) => {
  try {
    const [properties] = await pool.query(`
      SELECT 
        p.*, 
        u.full_name, 
        u.email,
        u.role,
        approver.full_name as approved_by_name,
        rejector.full_name as rejected_by_name
      FROM properties p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users approver ON p.approved_by = approver.id
      LEFT JOIN users rejector ON p.rejected_by = rejector.id
      ORDER BY p.created_at DESC
    `);
    
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Approve property
router.post('/properties/:id/approve', async (req, res) => {
  try {
    const propertyId = req.params.id;
    
    const [result] = await pool.query(
      `UPDATE properties 
       SET workflow_status = 'approved', 
           approved = 1,
           approved_at = NOW(), 
           approved_by = ?,
           rejected_at = NULL,
           rejected_by = NULL,
           rejection_reason = NULL
       WHERE id = ?`,
      [req.user.id, propertyId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json({ message: 'Property approved and is now live' });
  } catch (error) {
    console.error('Error approving property:', error);
    res.status(500).json({ error: 'Failed to approve property' });
  }
});

// Reject property
router.post('/properties/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const propertyId = req.params.id;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const [result] = await pool.query(
      `UPDATE properties 
       SET workflow_status = 'rejected',
           approved = 0,
           rejected_at = NOW(), 
           rejected_by = ?, 
           rejection_reason = ?,
           approved_at = NULL,
           approved_by = NULL
       WHERE id = ?`,
      [req.user.id, reason, propertyId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json({ message: 'Property rejected', reason: reason });
  } catch (error) {
    console.error('Error rejecting property:', error);
    res.status(500).json({ error: 'Failed to reject property' });
  }
});

// Re-approve a previously rejected property
router.post('/properties/:id/reapprove', async (req, res) => {
  try {
    const propertyId = req.params.id;
    
    const [result] = await pool.query(
      `UPDATE properties 
       SET workflow_status = 'approved',
           approved = 1,
           approved_at = NOW(), 
           approved_by = ?,
           rejected_at = NULL,
           rejected_by = NULL,
           rejection_reason = NULL
       WHERE id = ?`,
      [req.user.id, propertyId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json({ message: 'Property re-approved and is now live' });
  } catch (error) {
    console.error('Error re-approving property:', error);
    res.status(500).json({ error: 'Failed to re-approve property' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const [user] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user's data in order (foreign key constraints)
    await pool.query('DELETE FROM favourites WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM advertisements WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM services WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM properties WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Delete property
router.delete('/properties/:id', async (req, res) => {
  try {
    const propertyId = req.params.id;
    
    // Check if property exists
    const [property] = await pool.query('SELECT id FROM properties WHERE id = ?', [propertyId]);
    if (property.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Delete property data
    await pool.query('DELETE FROM favourites WHERE property_id = ?', [propertyId]);
    await pool.query('DELETE FROM properties WHERE id = ?', [propertyId]);
    
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// Delete service
router.delete('/services/:id', async (req, res) => {
  try {
    const serviceId = req.params.id;
    
    // Check if service exists
    const [service] = await pool.query('SELECT id FROM services WHERE id = ?', [serviceId]);
    if (service.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    await pool.query('DELETE FROM services WHERE id = ?', [serviceId]);
    
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Delete advertisement
router.delete('/advertisements/:id', async (req, res) => {
  try {
    const adId = req.params.id;
    
    // Check if advertisement exists
    const [ad] = await pool.query('SELECT id FROM advertisements WHERE id = ?', [adId]);
    if (ad.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    await pool.query('DELETE FROM advertisements WHERE id = ?', [adId]);
    
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('Error deleting advertisement:', error);
    res.status(500).json({ error: 'Failed to delete advertisement' });
  }
});

// Approve service
router.post('/services/:id/approve', async (req, res) => {
  try {
    const serviceId = req.params.id;
    
    const [result] = await pool.query(
      `UPDATE services 
       SET status = 'active', 
           approved = 1,
           approved_at = NOW(), 
           approved_by = ?
       WHERE id = ?`,
      [req.user.id, serviceId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({ message: 'Service approved and is now live' });
  } catch (error) {
    console.error('Error approving service:', error);
    res.status(500).json({ error: 'Failed to approve service' });
  }
});

// Reject service
router.post('/services/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const serviceId = req.params.id;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const [result] = await pool.query(
      `UPDATE services 
       SET status = 'rejected',
           approved = 0,
           rejected_at = NOW(), 
           rejected_by = ?, 
           rejection_reason = ?
       WHERE id = ?`,
      [req.user.id, reason, serviceId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({ message: 'Service rejected', reason: reason });
  } catch (error) {
    console.error('Error rejecting service:', error);
    res.status(500).json({ error: 'Failed to reject service' });
  }
});

// Get pending services for approval
router.get('/pending-services', async (req, res) => {
  try {
    const [services] = await pool.query(`
      SELECT 
        s.*, 
        u.full_name, 
        u.email,
        u.role
      FROM services s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'pending'
      ORDER BY s.created_at ASC
    `);
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching pending services:', error);
    res.status(500).json({ error: 'Failed to fetch pending services' });
  }
});

// Get all services with their approval status
router.get('/services', async (req, res) => {
  try {
    const [services] = await pool.query(`
      SELECT 
        s.*, 
        u.full_name, 
        u.email,
        u.role,
        approver.full_name as approved_by_name
      FROM services s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN users approver ON s.approved_by = approver.id
      ORDER BY s.created_at DESC
    `);
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Approve advertisement
router.post('/advertisements/:id/approve', async (req, res) => {
  try {
    const adId = req.params.id;
    
    const [result] = await pool.query(
      `UPDATE advertisements 
       SET status = 'approved', 
           approved_at = NOW(), 
           approved_by = ?,
           rejected_at = NULL,
           rejected_by = NULL,
           rejection_reason = NULL
       WHERE id = ?`,
      [req.user.id, adId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    res.json({ message: 'Advertisement approved and is now live' });
  } catch (error) {
    console.error('Error approving advertisement:', error);
    res.status(500).json({ error: 'Failed to approve advertisement' });
  }
});

// Reject advertisement
router.post('/advertisements/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const adId = req.params.id;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const [result] = await pool.query(
      `UPDATE advertisements 
       SET status = 'rejected',
           rejected_at = NOW(), 
           rejected_by = ?, 
           rejection_reason = ?,
           approved_at = NULL,
           approved_by = NULL
       WHERE id = ?`,
      [req.user.id, reason, adId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    res.json({ message: 'Advertisement rejected', reason: reason });
  } catch (error) {
    console.error('Error rejecting advertisement:', error);
    res.status(500).json({ error: 'Failed to reject advertisement' });
  }
});

// Get pending advertisements for approval
router.get('/pending-advertisements', async (req, res) => {
  try {
    const [advertisements] = await pool.query(`
      SELECT 
        a.*, 
        u.full_name, 
        u.email,
        u.role
      FROM advertisements a
      JOIN users u ON a.user_id = u.id
      WHERE a.status = 'pending'
      ORDER BY a.created_at ASC
    `);
    
    res.json(advertisements);
  } catch (error) {
    console.error('Error fetching pending advertisements:', error);
    res.status(500).json({ error: 'Failed to fetch pending advertisements' });
  }
});

// Get all advertisements with their approval status
router.get('/advertisements', async (req, res) => {
  try {
    const [advertisements] = await pool.query(`
      SELECT 
        a.*, 
        u.full_name, 
        u.email,
        u.role,
        approver.full_name as approved_by_name,
        rejector.full_name as rejected_by_name
      FROM advertisements a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN users approver ON a.approved_by = approver.id
      LEFT JOIN users rejector ON a.rejected_by = rejector.id
      ORDER BY a.created_at DESC
    `);
    
    res.json(advertisements);
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    res.status(500).json({ error: 'Failed to fetch advertisements' });
  }
});

module.exports = router;