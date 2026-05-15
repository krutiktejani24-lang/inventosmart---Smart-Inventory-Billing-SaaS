const { PrismaClient } = require('@prisma/client');
const { calculateInvoiceTotals } = require('./gstEngine');
const pdfGenerator = require('./pdfGenerator');
const nodemailer                 = require('nodemailer');

const prisma = new PrismaClient();

/* ─────────────────────────────────────────────────────────────────────
   AUTO INVOICE NUMBER — INV-2025-0001
───────────────────────────────────────────────────────────────────── */
const generateInvoiceNo = async (businessId) => {
  const year  = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { business_id: businessId } });
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
};

/* ─────────────────────────────────────────────────────────────────────
   CREATE INVOICE
───────────────────────────────────────────────────────────────────── */
/**
 * @param {string} businessId
 * @param {object} data - { customerId, items, discount, notes, dueDate, placeOfSupply, businessState }
 */
const createInvoice = async (businessId, data) => {
  const {
    customerId,
    items = [],
    discount     = 0,
    notes,
    dueDate,
    placeOfSupply,
    businessState,  // business ka state — inter/intra determine karne ke liye
  } = data;

  if (!items.length) throw new Error('Invoice must have at least one item');

  // Intra-state check: place of supply == business state → CGST+SGST, else IGST
  const isIGST = placeOfSupply &&
    businessState &&
    placeOfSupply.toLowerCase() !== businessState.toLowerCase();

  // GST calculation
  const calc = calculateInvoiceTotals(items, isIGST, Number(discount));

  return prisma.$transaction(async (tx) => {
    const invoiceNo = await generateInvoiceNo(businessId);

    const invoice = await tx.invoice.create({
      data: {
        invoice_no:      invoiceNo,
        customer_id:     customerId,
        business_id:     businessId,
        subtotal:        calc.subtotal,
        discount:        calc.discount,
        cgst:            calc.cgst,
        sgst:            calc.sgst,
        igst:            calc.igst,
        total:           calc.total,
        status:          'DRAFT',
        notes:           notes || null,
        due_date:        dueDate ? new Date(dueDate) : null,
        place_of_supply: placeOfSupply || null,
        is_igst:         isIGST || false,
        items: {
          create: calc.items.map((item) => ({
            product_id: item.productId || null,
            name:       item.name,
            hsn_code:   item.hsn_code || null,
            qty:        Number(item.qty),
            price:      Number(item.price),
            discount:   Number(item.discount || 0),
            gst_rate:   Number(item.gst_rate),
            cgst:       item.cgst,
            sgst:       item.sgst,
            igst:       item.igst,
            total:      item.total,
          })),
        },
      },
      include: {
        items:    true,
        customer: { select: { id:true, name:true, email:true, phone:true, gstin:true, address:true, city:true, state:true } },
      },
    });

    return invoice;
  });
};

/* ─────────────────────────────────────────────────────────────────────
   GET INVOICES (paginated + filters)
───────────────────────────────────────────────────────────────────── */
const getInvoices = async (businessId, options = {}) => {
  const {
    page = 1, limit = 20,
    status, customerId,
    from, to,
    search = '',
  } = options;

  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    business_id: businessId,
    ...(status     && { status }),
    ...(customerId && { customer_id: customerId }),
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to   && { lte: new Date(new Date(to).setHours(23, 59, 59)) }),
      },
    },
    ...(search && {
      OR: [
        { invoice_no: { contains: search, mode: 'insensitive' } },
        { customer:   { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: { select: { id:true, name:true, phone:true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    invoices,
    pagination: {
      total,
      page:       Number(page),
      limit:      Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/* ─────────────────────────────────────────────────────────────────────
   GET SINGLE INVOICE
───────────────────────────────────────────────────────────────────── */
const getInvoiceById = async (id, businessId) => {
  return prisma.invoice.findFirst({
    where: { id, business_id: businessId },
    include: {
      items:    true,
      customer: true,
      payments: { orderBy: { created_at: 'desc' } },
    },
  });
};

/* ─────────────────────────────────────────────────────────────────────
   UPDATE STATUS
───────────────────────────────────────────────────────────────────── */
const updateInvoiceStatus = async (id, businessId, status) => {
  const invoice = await prisma.invoice.findFirst({ where: { id, business_id: businessId } });
  if (!invoice) return null;

  // CANCELLED invoice reopen na kari shake
  if (invoice.status === 'CANCELLED' && status !== 'CANCELLED')
    throw new Error('Cancelled invoice cannot be reopened');

  return prisma.invoice.update({ where: { id }, data: { status } });
};

/* ─────────────────────────────────────────────────────────────────────
   GET PDF BUFFER
───────────────────────────────────────────────────────────────────── */
const getInvoicePDF = async (id, businessId) => {
  const invoice = await prisma.invoice.findFirst({
    where:   { id, business_id: businessId },
    include: {
      items:    true,
      customer: true,
      business: true,
    },
  });
  if (!invoice) return null;

  const pdfBuffer = await generateInvoicePDF(invoice);
  return { invoice, pdfBuffer };
};

/* ─────────────────────────────────────────────────────────────────────
   SEND EMAIL
───────────────────────────────────────────────────────────────────── */
const sendInvoiceEmail = async (id, businessId) => {
  const invoice = await prisma.invoice.findFirst({
    where:   { id, business_id: businessId },
    include: { items: true, customer: true, business: true },
  });
  if (!invoice)              throw new Error('Invoice not found');
  if (!invoice.customer?.email) throw new Error('Customer email not found');

  const pdfBuffer = await generateInvoicePDF(invoice);

  const transporter = nodemailer.createTransport({
    host:   process.env.MAIL_HOST,
    port:   Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      invoice.customer.email,
    subject: `Invoice ${invoice.invoice_no} from ${invoice.business?.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#1e40af">Invoice ${invoice.invoice_no}</h2>
        <p>Dear ${invoice.customer.name},</p>
        <p>Please find attached your invoice of <strong>₹${invoice.total.toLocaleString('en-IN')}</strong>.</p>
        <p style="color:#64748b;font-size:13px">This is an auto-generated email from InventoSmart.</p>
      </div>
    `,
    attachments: [{
      filename:    `${invoice.invoice_no}.pdf`,
      content:     pdfBuffer,
      contentType: 'application/pdf',
    }],
  });

  // Status update to SENT if still DRAFT
  if (invoice.status === 'DRAFT') {
    await prisma.invoice.update({ where: { id }, data: { status: 'SENT' } });
  }

  return { message: `Invoice sent to ${invoice.customer.email}` };
};

/* ─────────────────────────────────────────────────────────────────────
   RECORD PAYMENT
───────────────────────────────────────────────────────────────────── */
/**
 * @param {string} id         - invoice id
 * @param {string} businessId
 * @param {object} paymentData - { amount, method, reference, notes }
 */
const recordPayment = async (id, businessId, paymentData) => {
  const invoice = await prisma.invoice.findFirst({
    where:   { id, business_id: businessId },
    include: { payments: true },
  });
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'CANCELLED') throw new Error('Cannot record payment on cancelled invoice');

  const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = invoice.total - totalPaid;

  if (paymentData.amount > remaining + 0.01)
    throw new Error(`Amount exceeds remaining balance of ₹${remaining.toFixed(2)}`);

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoice_id: id,
        amount:     Number(paymentData.amount),
        method:     paymentData.method || 'CASH',
        reference:  paymentData.reference || null,
        notes:      paymentData.notes     || null,
      },
    });

    // Auto-mark PAID if fully paid
    const newTotalPaid = totalPaid + Number(paymentData.amount);
    if (newTotalPaid >= invoice.total - 0.01) {
      await tx.invoice.update({ where: { id }, data: { status: 'PAID' } });
    }

    return payment;
  });
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  getInvoicePDF,
  sendInvoiceEmail,
  recordPayment,
};