const { validationResult } = require('express-validator');
const service = require('../services/billingService');

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ message: 'Validation failed', errors: errors.array() });
    return false;
  }
  return true;
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/invoices
───────────────────────────────────────────────────────────────────── */
const createInvoice = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const invoice = await service.createInvoice(req.user.businessId, req.body);
    return res.status(201).json({ message: 'Invoice created', invoice });
  } catch (err) {
    console.error('[createInvoice]', err);
    return res.status(400).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   GET /api/invoices
───────────────────────────────────────────────────────────────────── */
const getInvoices = async (req, res) => {
  try {
    const data = await service.getInvoices(req.user.businessId, req.query);
    return res.json(data);
  } catch (err) {
    console.error('[getInvoices]', err);
    return res.status(500).json({ message: 'Failed to fetch invoices' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   GET /api/invoices/:id
───────────────────────────────────────────────────────────────────── */
const getInvoice = async (req, res) => {
  try {
    const invoice = await service.getInvoiceById(req.params.id, req.user.businessId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    return res.json({ invoice });
  } catch (err) {
    console.error('[getInvoice]', err);
    return res.status(500).json({ message: 'Failed to fetch invoice' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   PUT /api/invoices/:id/status
───────────────────────────────────────────────────────────────────── */
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['DRAFT', 'SENT', 'PAID', 'CANCELLED'];
    if (!allowed.includes(status))
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });

    const invoice = await service.updateInvoiceStatus(req.params.id, req.user.businessId, status);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    return res.json({ message: `Invoice marked as ${status}`, invoice });
  } catch (err) {
    console.error('[updateStatus]', err);
    return res.status(400).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   GET /api/invoices/:id/pdf
───────────────────────────────────────────────────────────────────── */
const downloadPDF = async (req, res) => {
  try {
    const result = await service.getInvoicePDF(req.params.id, req.user.businessId);
    if (!result) return res.status(404).json({ message: 'Invoice not found' });

    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.invoice.invoice_no}.pdf"`);
    res.setHeader('Content-Length',      result.pdfBuffer.length);
    return res.end(result.pdfBuffer);
  } catch (err) {
    console.error('[downloadPDF]', err);
    return res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/invoices/:id/send-email
───────────────────────────────────────────────────────────────────── */
const sendEmail = async (req, res) => {
  try {
    const result = await service.sendInvoiceEmail(req.params.id, req.user.businessId);
    return res.json(result);
  } catch (err) {
    console.error('[sendEmail]', err);
    return res.status(400).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/invoices/:id/payment
───────────────────────────────────────────────────────────────────── */
const recordPayment = async (req, res) => {
  try {
    const { amount, method, reference, notes } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return res.status(400).json({ message: 'Valid payment amount is required' });

    const payment = await service.recordPayment(
      req.params.id,
      req.user.businessId,
      { amount, method, reference, notes }
    );

    return res.status(201).json({ message: 'Payment recorded', payment });
  } catch (err) {
    console.error('[recordPayment]', err);
    return res.status(400).json({ message: err.message });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateStatus,
  downloadPDF,
  sendEmail,
  recordPayment,
};