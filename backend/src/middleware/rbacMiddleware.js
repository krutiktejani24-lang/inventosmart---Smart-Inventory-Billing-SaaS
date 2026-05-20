/**
 * rbacMiddleware.js — Role Based Access Control
 *
 * Usage:
 *   const { allow } = require('../middleware/rbacMiddleware');
 *
 *   router.delete('/product/:id', protect, allow('ADMIN'), handler);
 *   router.put('/invoice/:id',    protect, allow('ADMIN', 'MANAGER'), handler);
 */

/**
 * allow — check if req.user.role is in the allowed list
 * Must be used AFTER protect middleware (which sets req.user)
 *
 * @param {...string} roles - 'ADMIN' | 'MANAGER' | 'STAFF'
 */
const allow = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized — login required' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied — requires role: ${roles.join(' or ')}`,
      yourRole: req.user.role,
    });
  }

  next();
};

/**
 * adminOnly — shorthand for allow('ADMIN')
 */
const adminOnly = allow('ADMIN');

/**
 * managerAndAbove — shorthand for allow('ADMIN', 'MANAGER')
 */
const managerAndAbove = allow('ADMIN', 'MANAGER');

/**
 * allRoles — all logged-in users (any role)
 * Same as just using protect, but explicit
 */
const allRoles = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  next();
};

module.exports = { allow, adminOnly, managerAndAbove, allRoles };