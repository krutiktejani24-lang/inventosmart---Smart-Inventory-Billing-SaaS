const router = require('express').Router();
const { portalProtect } = require('../middleware/portalMiddleware');
const ctrl = require('../controllers/portalController');

// Public
router.post('/send-otp',           ctrl.sendOTP);
router.post('/verify-otp',         ctrl.verifyOTP);

// Protected (customer JWT)
router.get('/me',                  portalProtect, ctrl.getPortalMe);
router.get('/summary',             portalProtect, ctrl.getPortalSummary);
router.get('/invoices',            portalProtect, ctrl.getPortalInvoices);
router.get('/invoices/:id',        portalProtect, ctrl.getPortalInvoice);
router.get('/invoices/:id/pdf',    portalProtect, ctrl.downloadPortalPDF);

module.exports = router;