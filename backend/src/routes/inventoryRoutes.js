const router  = require('express').Router();
const { body, query, param } = require('express-validator');
const { protect, allow }     = require('../middleware/authMiddleware');
const ctrl                   = require('../controllers/inventoryController');

// Optional: multer for CSV file upload
let upload;
try {
  const multer = require('multer');
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
} catch {
  upload = null; // multer install na hoy to CSV raw body thi aavse
}

/* ── Validation Rules ─────────────────────────────────────────────── */

const productRules = [
  body('name')
    .trim().notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Name too long'),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be >= 0'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost price must be >= 0'),
  body('stock_qty')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock qty must be >= 0'),
  body('min_threshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Min threshold must be >= 0'),
  body('gst_rate')
    .optional()
    .isIn([0, 5, 12, 18, 28]).withMessage('GST rate must be 0, 5, 12, 18 or 28'),
];

const stockRules = [
  body('productId')
    .notEmpty().withMessage('Product ID is required'),
  body('qty')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('reason')
    .optional()
    .isLength({ max: 200 }).withMessage('Reason too long'),
];

/* ── Product Routes ───────────────────────────────────────────────── */

// GET  /api/products
router.get ('/',            protect,                           ctrl.getProducts);

// GET  /api/products/low-stock   ← /low-stock PEHLA aavvuj joie /:id thi pehla
router.get ('/low-stock',   protect,                           ctrl.getLowStock);

// GET  /api/products/categories
router.get ('/categories',  protect,                           ctrl.getCategories);

// POST /api/products/categories
router.post('/categories',  protect, allow('ADMIN','MANAGER'), ctrl.createCategory);

// POST /api/products/import-csv
router.post(
  '/import-csv',
  protect,
  allow('ADMIN', 'MANAGER'),
  ...(upload ? [upload.single('csv')] : []),
  ctrl.importCSV
);

// GET  /api/products/:id
router.get ('/:id',         protect,                           ctrl.getProduct);

// POST /api/products
router.post('/',            protect, allow('ADMIN','MANAGER'), productRules, ctrl.createProduct);

// PUT  /api/products/:id
router.put ('/:id',         protect, allow('ADMIN','MANAGER'), productRules, ctrl.updateProduct);

// DELETE /api/products/:id
router.delete('/:id',       protect, allow('ADMIN'),            ctrl.deleteProduct);

/* ── Stock Movement Routes (/api/inventory/...) ───────────────────── */

// POST /api/inventory/stock-in
router.post('/stock-in',    protect, allow('ADMIN','MANAGER','STAFF'), stockRules, ctrl.stockIn);

// POST /api/inventory/stock-out
router.post('/stock-out',   protect, allow('ADMIN','MANAGER','STAFF'), stockRules, ctrl.stockOut);

// GET  /api/inventory/movements/:productId
router.get ('/movements/:productId', protect,                  ctrl.getMovements);

module.exports = router;