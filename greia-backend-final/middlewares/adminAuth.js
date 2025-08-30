const adminAuth = (req, res, next) => {
  // Log debug information
  console.log('Admin auth check:', {
    userExists: !!req.user,
    userId: req.user?.id,
    userRole: req.user?.role,
    userEmail: req.user?.email
  });
  
  // Check if user exists
  if (!req.user) {
    console.log('Admin auth failed: No user object');
    return res.status(403).json({ 
      error: 'Access denied. Authentication required.' 
    });
  }
  
  // Check if user has admin role
  if (req.user.role !== 'admin') {
    console.log('Admin auth failed: User role is', req.user.role);
    return res.status(403).json({ 
      error: `Access denied. Admin privileges required. Current role: ${req.user.role}` 
    });
  }
  
  console.log('Admin auth passed for user:', req.user.email);
  next();
};

module.exports = adminAuth;
