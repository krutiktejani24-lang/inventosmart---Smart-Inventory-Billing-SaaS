const router = require('express').Router();
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  changePassword,
} = require('../controllers/authController');
const { protect, allow } = require('../middleware/authMiddleware');

/* ── Validation rules ─────────────────────────────────────────────── */
const registerRules = [
  body('businessName')
    .trim()
    .notEmpty().withMessage('Business name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Business name must be 2–100 chars'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('name')
    .trim()
    .notEmpty().withMessage('Your name is required')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 chars'),

  body('gstin')
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GSTIN format'),

  body('phone')
    .optional()
    .isMobilePhone('en-IN').withMessage('Invalid Indian phone number'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .notEmpty().withMessage('New password required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 chars'),
];

/* ── Routes ───────────────────────────────────────────────────────── */

// Public routes
router.post('/register',        registerRules,       register);
router.post('/login',           loginRules,          login);
router.post('/logout',                               logout);

// Protected routes (JWT required)
router.get('/me',               protect,             getMe);
router.post('/change-password', protect, changePasswordRules, changePassword);

// Team management (Settings page)
router.get('/team',  protect, allow('ADMIN'), async (req, res) => {
const prisma = require('../config/prisma');
  try {
    const users = await prisma.user.findMany({
      where: { business_id: req.user.businessId },
      select: { id:true, name:true, email:true, role:true, is_active:true, created_at:true },
      orderBy: { created_at: 'asc' },
    });
    res.json({ users });
  } catch(e) { res.status(500).json({ message: 'Failed to fetch team' }); }
});

router.post('/team', protect, allow('ADMIN'), async (req, res) => {
  const prisma = require('../config/prisma');
  const bcrypt = require('bcryptjs');
  const prisma = require('../config/prisma');
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'name, email, password required' });
  try {
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'STAFF', business_id: req.user.businessId },
      select: { id:true, name:true, email:true, role:true },
    });
    res.status(201).json({ message: 'Team member added', user });
  } catch(e) {
    if (e.code === 'P2002') return res.status(409).json({ message: 'Email already registered' });
    res.status(500).json({ message: 'Failed to add member' });
  }
});

// Business profile update
router.put('/business', protect, allow('ADMIN'), async (req, res) => {
const prisma = require('../config/prisma');
  const { name, gstin, phone, email, address } = req.body;
  try {
    const business = await prisma.business.update({
      where: { id: req.user.businessId },
      data: { name, gstin, phone, email, address: address || null },
    });
    res.json({ message: 'Business updated', business });
  } catch(e) {

  console.error('[BUSINESS UPDATE ERROR]', e)

  res.status(500).json({

    message: 'Failed to update business',

    error: e.message}); }
});

module.exports = router;