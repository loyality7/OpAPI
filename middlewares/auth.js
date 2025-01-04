const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Check if token exists
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        success: false,
        message: 'No authentication token, access denied'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Log decoded token for debugging
      console.log('Decoded Token:', decoded);

      // Check if all required fields are present
      if (!decoded.id || !decoded.role) {
        console.log('Invalid token structure:', decoded);
        return res.status(401).json({
          success: false,
          message: 'Invalid token structure'
        });
      }

      // Add user info to request
      req.user = {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
        phoneNumber: decoded.phoneNumber
      };

      next();
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    console.log('Checking role:', {
      userRole: req.user?.role,
      allowedRoles: roles
    });

    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: insufficient permissions'
      });
    }
    next();
  };
};

module.exports = { auth, checkRole };
