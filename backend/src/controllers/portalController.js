const { PrismaClient } = require('@prisma/client');
const jwt             = require('jsonwebtoken');
const nodemailer      = require('nodemailer');
const prisma = new PrismaClient();

// In-memory OTP store (production: use Redis)
const otpStore = new Map();
const genOTP   = () => String(Math.floor(100000 + Math.random() * 900000));

const mailer = () => nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

/* POST /api/portal/send-otp */
const sendOTP = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier?.trim()) return res.status(400).json({ message: 'Email or phone required' });
    const clean = identifier.trim().toLowerCase();

    const customer = await prisma.customer.findFirst({
      where: { OR: [{ email: clean }, { phone: clean }, { phone: clean.replace(/^(\+91|91)/, '') }] },
      include: { business: { select: { id:true, name:true, logo_url:true } } },
    });
    if (!customer) return res.status(404).json({ message: 'No account found with this email/phone' });

    const otp     = genOTP();
    const expires = Date.now() + 10 * 60 * 1000;
    otpStore.set(clean, { otp, expires, customerId: customer.id, businessId: customer.business_id });

    if (customer.email) {
      try {
        await mailer().sendMail({
          from: process.env.MAIL_FROM,
          to: customer.email,
          subject: `Your Login OTP — ${otp}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:480px">
            <div style="background:#1e40af;padding:20px 24px;border-radius:12px 12px 0 0">
              <h2 style="color:#fff;margin:0">InventoSmart</h2>
              <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">Customer Portal Login</p>
            </div>
            <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px">
              <p style="color:#334155">Dear <strong>${customer.name}</strong>,</p>
              <div style="text-align:center;margin:20px 0">
                <div style="background:#1e40af;color:#fff;font-size:36px;font-weight:bold;letter-spacing:12px;padding:16px 32px;border-radius:12px;display:inline-block">${otp}</div>
              </div>
              <p style="color:#64748b;font-size:13px;text-align:center">Valid for <strong>10 minutes</strong>. Do not share.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:16px">Sent by ${customer.business?.name}</p>
            </div>
          </div>`,
        });
      } catch (e) { console.error('[sendOTP email]', e.message); }
    }

    if (process.env.NODE_ENV !== 'production')
      console.log(`\n[OTP DEV] ${customer.name} → ${otp}\n`);

    return res.json({
      message: 'OTP sent successfully',
      maskedTo: customer.email
        ? customer.email.replace(/(.{2}).*(@.*)/, '$1***$2')
        : `****${clean.slice(-4)}`,
    });
  } catch (err) {
    console.error('[sendOTP]', err);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
};

/* POST /api/portal/verify-otp */
const verifyOTP = async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) return res.status(400).json({ message: 'identifier and otp required' });

    const clean  = identifier.trim().toLowerCase();
    const stored = otpStore.get(clean);

    if (!stored) return res.status(400).json({ message: 'OTP expired. Request a new one.' });
    if (Date.now() > stored.expires) { otpStore.delete(clean); return res.status(400).json({ message: 'OTP expired.' }); }
    if (stored.otp !== otp.toString().trim()) return res.status(400).json({ message: 'Invalid OTP.' });

    otpStore.delete(clean);

    const customer = await prisma.customer.findFirst({
      where: { id: stored.customerId },
      include: { business: { select: { id:true, name:true, gstin:true, logo_url:true, phone:true, email:true } } },
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const token = jwt.sign(
      { customerId: customer.id, businessId: customer.business_id, type: 'CUSTOMER_PORTAL' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      customer: { id:customer.id, name:customer.name, email:customer.email, phone:customer.phone, gstin:customer.gstin, city:customer.city, state:customer.state, balance:customer.balance },
      business: customer.business,
    });
  } catch (err) {
    console.error('[verifyOTP]', err);
    return res.status(500).json({ message: 'Verification failed' });
  }
};

/* GET /api/portal/me */
const getPortalMe = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.customer.customerId },
      include: { business: { select: { id:true, name:true, gstin:true, logo_url:true, phone:true } } },
    });
    if (!customer) return res.status(404).json({ message: 'Not found' });
    return res.json({ customer });
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

/* GET /api/portal/summary */
const getPortalSummary = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { customer_id: req.customer.customerId, business_id: req.customer.businessId },
    });
    const r = (n) => Math.round(n * 100) / 100;
    return res.json({
      totalBilled:   r(invoices.reduce((s,i) => s+i.total, 0)),
      totalPaid:     r(invoices.filter(i=>i.status==='PAID').reduce((s,i) => s+i.total, 0)),
      outstanding:   r(invoices.filter(i=>['SENT','DRAFT'].includes(i.status)).reduce((s,i) => s+i.total, 0)),
      invoiceCount:  invoices.length,
      paidCount:     invoices.filter(i=>i.status==='PAID').length,
    });
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

/* GET /api/portal/invoices */
const getPortalInvoices = async (req, res) => {
  try {
    const { page=1, limit=10, status } = req.query;
    const skip = (Number(page)-1) * Number(limit);
    const where = {
      customer_id: req.customer.customerId,
      business_id: req.customer.businessId,
      ...(status && { status }),
    };
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({ where, include:{ items:true, payments:true }, orderBy:{ created_at:'desc' }, skip, take:Number(limit) }),
      prisma.invoice.count({ where }),
    ]);
    return res.json({ invoices, pagination:{ total, page:Number(page), limit:Number(limit), totalPages: Math.ceil(total/Number(limit)) } });
  } catch (err) { return res.status(500).json({ message: 'Failed' }); }
};

/* GET /api/portal/invoices/:id */
const getPortalInvoice = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id:req.params.id, customer_id:req.customer.customerId, business_id:req.customer.businessId },
      include: { items:true, payments:true, business:true, customer:true },
    });
    if (!invoice) return res.status(404).json({ message: 'Not found' });
    return res.json({ invoice });
  } catch (err) { return res.status(500).json({ message: 'Failed' }); }
};

/* GET /api/portal/invoices/:id/pdf */
const downloadPortalPDF = async (req, res) => {
  try {
    const { generateInvoicePDF } = require('../utils/pdfGenerator');
    const invoice = await prisma.invoice.findFirst({
      where: { id:req.params.id, customer_id:req.customer.customerId },
      include: { items:true, customer:true, business:true },
    });
    if (!invoice) return res.status(404).json({ message: 'Not found' });
    const buf = await generateInvoicePDF(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_no}.pdf"`);
    return res.end(buf);
  } catch (err) { return res.status(500).json({ message: 'Failed' }); }
};

module.exports = { sendOTP, verifyOTP, getPortalMe, getPortalSummary, getPortalInvoices, getPortalInvoice, downloadPortalPDF };