const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/reportController');

/**
 * All report routes — sirf logged-in users access kari shake
 * ?format=pdf   → PDFKit PDF download
 * ?format=excel → ExcelJS .xlsx download
 * (no format)   → JSON response
 */

// GET /api/reports/dashboard
router.get('/dashboard',             protect, ctrl.getDashboard);

// GET /api/reports/sales?from=&to=&format=
router.get('/sales',                 protect, ctrl.getSalesReport);

// GET /api/reports/profit-loss?from=&to=&format=
router.get('/profit-loss',           protect, ctrl.getProfitLoss);

// GET /api/reports/inventory-valuation?format=
router.get('/inventory-valuation',   protect, ctrl.getInventoryValuation);

// GET /api/reports/gstr1?month=&year=&format=
router.get('/gstr1',                 protect, ctrl.getGSTR1);

// GET /api/reports/top-products?limit=10&from=&to=&format=
router.get('/top-products',          protect, ctrl.getTopProducts);

// GET /api/reports/low-stock?format=
router.get('/low-stock',             protect, ctrl.getLowStockReport);

module.exports = router;