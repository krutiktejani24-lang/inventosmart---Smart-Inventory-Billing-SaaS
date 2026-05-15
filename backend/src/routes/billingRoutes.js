const router = require('express').Router();
const { body } = require('express-validator');
const { protect, allow } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/billingController');

/* ── Validation Rules ─────────────────────────────────────────────── */

const createInvoiceRules = [
  body('customerId')
    .notEmpty().withMessage('Customer ID is required'),

  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required'),

  body('items.*.name')
    .notEmpty().withMessage('Item name is required'),

  body('items.*.qty')
    .isInt({ min: 1 }).withMessage('Item qty must be >= 1'),

  body('items.*.price')
    .isFloat({ min: 0 }).withMessage('Item price must be >= 0'),

  body('items.*.discount')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be 0–100'),

  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Invoice discount must be 0–100'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid date (YYYY-MM-DD)'),
];

/* ── Routes ───────────────────────────────────────────────────────── */

// GET  /api/invoices                 — list with filters
router.get('/',                  protect,                           ctrl.getInvoices);

// GET  /api/invoices/:id             — single invoice
router.get('/:id',               protect,                           ctrl.getInvoice);

// POST /api/invoices                 — create new invoice
router.post('/',                 protect, allow('ADMIN','MANAGER'), createInvoiceRules, ctrl.createInvoice);

// PUT  /api/invoices/:id/status      — change status
router.put('/:id/status',        protect, allow('ADMIN','MANAGER'), ctrl.updateStatus);

// GET  /api/invoices/:id/pdf         — download PDF
router.get('/:id/pdf',           protect,                           ctrl.downloadPDF);

// POST /api/invoices/:id/send-email  — email bhejo
router.post('/:id/send-email',   protect, allow('ADMIN','MANAGER'), ctrl.sendEmail);

// POST /api/invoices/:id/payment     — payment record karo
router.post('/:id/payment',      protect, allow('ADMIN','MANAGER'), ctrl.recordPayment);

module.exports = router;