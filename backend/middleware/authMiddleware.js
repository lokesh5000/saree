const jwt = require('jsonwebtoken');
const supabase = require('../supabaseService');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];


      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the 'users' table based on the decoded ID
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, role, store_id') // Select necessary user fields
        .eq('id', decoded.id)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        storeId: user.store_id // Use storeId for consistency with previous naming
      };
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
