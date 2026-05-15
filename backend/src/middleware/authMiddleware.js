const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/* ─────────────────────────────────────────────────────────────────────
   protect — JWT verify karo, req.user set karo
   Usage: router.get('/route', protect, handler)
───────────────────────────────────────────────────────────────────── */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'Unauthorized — no token provided' });

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError')
        return res.status(401).json({ message: 'Session expired — please login again' });
      return res.status(401).json({ message: 'Invalid token' });
    }

    // User DB ma exist kare che? (deactivated check)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, business_id: true, is_active: true },
    });

    if (!user)
      return res.status(401).json({ message: 'User not found' });

    if (!user.is_active)
      return res.status(403).json({ message: 'Account deactivated' });

    // req.user set karo — controllers ma use thay
    req.user = {
      userId:     user.id,
      businessId: user.business_id,
      role:       user.role,
    };

    next();
  } catch (err) {
    console.error('[protect middleware]', err);
    return res.status(500).json({ message: 'Auth middleware error' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   allow — Role-Based Access Control
   Usage: router.delete('/product/:id', protect, allow('ADMIN', 'MANAGER'), handler)
───────────────────────────────────────────────────────────────────── */
const allow = (...roles) => (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ message: 'Unauthorized' });

  if (!roles.includes(req.user.role))
    return res.status(403).json({
      message: `Access denied — requires role: ${roles.join(' or ')}`,
    });

  next();
};

/* ─────────────────────────────────────────────────────────────────────
   sameBusinessOnly — Cross-tenant access rokvo
   Ensures resource belongs to req.user.businessId
───────────────────────────────────────────────────────────────────── */
const sameBusinessOnly = (businessIdGetter) => (req, res, next) => {
  const resourceBusinessId =
    typeof businessIdGetter === 'function'
      ? businessIdGetter(req)
      : req[businessIdGetter];

  if (resourceBusinessId && resourceBusinessId !== req.user.businessId)
    return res.status(403).json({ message: 'Cross-tenant access denied' });

  next();
};

module.exports = { protect, allow, sameBusinessOnly };