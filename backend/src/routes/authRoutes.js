const router = require('express').Router();
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

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

module.exports = router;