const jwt = require('jsonwebtoken');
const portalProtect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'CUSTOMER_PORTAL')
      return res.status(403).json({ message: 'Customer portal access only' });
    req.customer = { customerId: decoded.customerId, businessId: decoded.businessId };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Session expired' });
    return res.status(401).json({ message: 'Invalid token' });
  }
};
module.exports = { portalProtect };