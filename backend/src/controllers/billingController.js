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


/* ─────────────────────────────────────────────────────────────────────
   GET /api/invoices/:id/whatsapp
   WhatsApp share link + message return karo
───────────────────────────────────────────────────────────────────── */
const getWhatsAppLink = async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const { buildWhatsAppMessage, buildWhatsAppURL } = require('../utils/whatsappHelper');
    const prisma = new PrismaClient();

    const invoice = await prisma.invoice.findFirst({
      where:   { id: req.params.id, business_id: req.user.businessId },
      include: { items: true, customer: true, business: true },
    });

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // PDF download link (direct backend URL)
    const baseUrl   = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const pdfLink   = `${baseUrl}/api/invoices/${invoice.id}/pdf`;
    const invoiceWithPDF = { ...invoice, pdfLink };

    const message   = buildWhatsAppMessage(invoiceWithPDF);
    const waURL     = buildWhatsAppURL(invoice.customer?.phone, message);

    return res.json({
      whatsappURL: waURL,
      message,
      customerPhone: invoice.customer?.phone || null,
      customerName:  invoice.customer?.name  || null,
    });
  } catch (err) {
    console.error('[getWhatsAppLink]', err);
    return res.status(500).json({ message: 'Failed to generate WhatsApp link' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   GET /api/invoices/:id/upi-qr
   UPI QR code as base64 PNG return karo — frontend display mate
───────────────────────────────────────────────────────────────────── */
const getUPIQR = async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const invoice = await prisma.invoice.findFirst({
      where:   { id: req.params.id, business_id: req.user.businessId },
      include: { business: true },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

   const upiId = null;
    if (!upiId)
      return res.status(400).json({ message: 'UPI ID not configured. Set it in Settings → Business Profile.' });

    let generateUPIQRBase64;
    try {
      generateUPIQRBase64 = require('../utils/upiQRHelper').generateUPIQRBase64;
    } catch {
      return res.status(500).json({ message: 'qrcode package not installed. Run: npm install qrcode' });
    }

    const qrDataUrl = await generateUPIQRBase64({
      upiId,
      payeeName: invoice.business.name,
      amount:    invoice.total,
      invoiceNo: invoice.invoice_no,
    });

    const { buildUPIString } = require('../utils/upiQRHelper');
    const upiString = buildUPIString({
      upiId,
      payeeName: invoice.business.name,
      amount:    invoice.total,
      invoiceNo: invoice.invoice_no,
    });

    return res.json({
      qrDataUrl,
      upiId,
      upiString,
      amount:    invoice.total,
      invoiceNo: invoice.invoice_no,
      payeeName: invoice.business.name,
    });
  } catch (err) {
    console.error('[getUPIQR]', err);
    return res.status(500).json({ message: 'Failed to generate UPI QR' });
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
  getWhatsAppLink,
  getUPIQR,
};
