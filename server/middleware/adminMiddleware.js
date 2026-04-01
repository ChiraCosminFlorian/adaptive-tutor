const User = require('../models/User');

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  User.findById(req.user.userId)
    .select('role')
    .then((user) => {
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      req.user.role = user.role;
      next();
    })
    .catch((err) => next(err));
}

module.exports = { requireAdmin };
