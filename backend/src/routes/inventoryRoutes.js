const router  = require('express').Router();
const { body } = require('express-validator');
const { protect, allow } = require('../middleware/authMiddleware');
const ctrl               = require('../controllers/inventoryController');

let upload;
try {
  const multer = require('multer');
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
} catch { upload = null; }

const productRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').notEmpty().isFloat({ min: 0 }).withMessage('Price must be >= 0'),
  body('cost_price').optional({ nullable:true, checkFalsy:true }).isFloat({ min: 0 }),
  body('stock_qty').optional({ nullable:true, checkFalsy:true }).isInt({ min: 0 }),
  body('min_threshold').optional({ nullable:true, checkFalsy:true }).isInt({ min: 0 }),
  body('gst_rate').optional({ nullable:true, checkFalsy:true }).toFloat(),
];

const stockRules = [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('qty').notEmpty().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

// IMPORTANT: specific routes BEFORE /:id
router.get ('/low-stock',            protect,                           ctrl.getLowStock);
router.get ('/categories',           protect,                           ctrl.getCategories);
router.post('/categories',           protect, allow('ADMIN','MANAGER'), ctrl.createCategory);
router.post('/import-csv',           protect, allow('ADMIN','MANAGER'),
  ...(upload ? [upload.single('csv')] : []), ctrl.importCSV);

router.get ('/',    protect,                           ctrl.getProducts);
router.get ('/:id', protect,                           ctrl.getProduct);
router.post('/',    protect, allow('ADMIN','MANAGER'), productRules, ctrl.createProduct);
router.put ('/:id', protect, allow('ADMIN','MANAGER'), productRules, ctrl.updateProduct);
router.delete('/:id', protect, allow('ADMIN'),         ctrl.deleteProduct);

router.post('/stock-in',             protect, allow('ADMIN','MANAGER','STAFF'), stockRules, ctrl.stockIn);
router.post('/stock-out',            protect, allow('ADMIN','MANAGER','STAFF'), stockRules, ctrl.stockOut);
router.get ('/movements/:productId', protect,                                   ctrl.getMovements);

module.exports = router;