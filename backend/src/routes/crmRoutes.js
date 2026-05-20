const router = require('express').Router();
const { body } = require('express-validator');
const { protect }  = require('../middleware/authMiddleware');
const { allow }    = require('../middleware/rbacMiddleware');
const customerCtrl = require('../controllers/customerController');
const vendorCtrl   = require('../controllers/vendorController');

/* ── Validation Rules ─────────────────────────────────────────────── */

// Loose validation — no strict GSTIN/phone format checks
const customerRules = [
  body('name').trim().notEmpty().withMessage('Customer name is required'),
  body('email').optional({ nullable:true, checkFalsy:true }).isEmail().normalizeEmail(),
  body('phone').optional({ nullable:true, checkFalsy:true }).trim(),
  body('gstin').optional({ nullable:true, checkFalsy:true }).trim().toUpperCase(),
  body('address').optional({ nullable:true, checkFalsy:true }).trim(),
  body('city').optional({ nullable:true, checkFalsy:true }).trim(),
  body('state').optional({ nullable:true, checkFalsy:true }).trim(),
];

const vendorRules = [
  body('name').trim().notEmpty().withMessage('Vendor name is required'),
  body('email').optional({ nullable:true, checkFalsy:true }).isEmail().normalizeEmail(),
  body('phone').optional({ nullable:true, checkFalsy:true }).trim(),
  body('gstin').optional({ nullable:true, checkFalsy:true }).trim().toUpperCase(),
  body('address').optional({ nullable:true, checkFalsy:true }).trim(),
];

const poRules = [
  body('vendorId').notEmpty().withMessage('Vendor ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required for each item'),
  body('items.*.qty').isInt({ min: 1 }).withMessage('Qty must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be >= 0'),
];

/* ══════════════════════════════════════════════════════════════════
   CUSTOMER ROUTES
══════════════════════════════════════════════════════════════════ */
router.get   ('/customers',              protect,                           customerCtrl.getCustomers);
router.get   ('/customers/:id',          protect,                           customerCtrl.getCustomer);
router.post  ('/customers',              protect, allow('ADMIN','MANAGER'), customerRules, customerCtrl.createCustomer);
router.put   ('/customers/:id',          protect, allow('ADMIN','MANAGER'), customerRules, customerCtrl.updateCustomer);
router.delete('/customers/:id',          protect, allow('ADMIN'),           customerCtrl.deleteCustomer);
router.get   ('/customers/:id/invoices', protect,                           customerCtrl.getCustomerInvoices);
router.get   ('/customers/:id/balance',  protect,                           customerCtrl.getCustomerBalance);
router.post  ('/customers/:id/payment',  protect, allow('ADMIN','MANAGER'), customerCtrl.recordCustomerPayment);

/* ══════════════════════════════════════════════════════════════════
   VENDOR ROUTES
══════════════════════════════════════════════════════════════════ */
router.get   ('/vendors',                protect,                           vendorCtrl.getVendors);
router.get   ('/vendors/:id',            protect,                           vendorCtrl.getVendor);
router.post  ('/vendors',                protect, allow('ADMIN','MANAGER'), vendorRules, vendorCtrl.createVendor);
router.put   ('/vendors/:id',            protect, allow('ADMIN','MANAGER'), vendorRules, vendorCtrl.updateVendor);
router.delete('/vendors/:id',            protect, allow('ADMIN'),           vendorCtrl.deleteVendor);

/* ══════════════════════════════════════════════════════════════════
   PURCHASE ORDER ROUTES
══════════════════════════════════════════════════════════════════ */
router.post  ('/purchase-orders',              protect, allow('ADMIN','MANAGER'), poRules, vendorCtrl.createPurchaseOrder);
router.get   ('/purchase-orders',              protect,                           vendorCtrl.getPurchaseOrders);
router.get   ('/purchase-orders/:id',          protect,                           vendorCtrl.getPurchaseOrder);
router.put   ('/purchase-orders/:id/receive',  protect, allow('ADMIN','MANAGER'), vendorCtrl.receivePurchaseOrder);
router.put   ('/purchase-orders/:id/cancel',   protect, allow('ADMIN','MANAGER'), vendorCtrl.cancelPurchaseOrder);

module.exports = router;