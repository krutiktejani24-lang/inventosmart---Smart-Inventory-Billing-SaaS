/**
 * allow — role-based access control
 * Usage: router.get('/admin', protect, allow('ADMIN'), handler)
 */
const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ message: 'Forbidden — insufficient role' });
  next();
};

module.exports = { allow };
