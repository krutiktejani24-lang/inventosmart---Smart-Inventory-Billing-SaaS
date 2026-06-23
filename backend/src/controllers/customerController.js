const prisma = require('../config/prisma');
const { validationResult } = require('express-validator');
const { paginate, paginationMeta } = require('../utils/helpers');

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ message: 'Validation failed', errors: errors.array() });
    return false;
  }
  return true;
};

/* ─────────────────────────────────────────────────────────────────────
   GET /api/customers
   Paginated list with search
───────────────────────────────────────────────────────────────────── */
const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {
      business_id: req.user.businessId,
      ...(search && {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { gstin: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      prisma.customer.count({ where }),
    ]);

    return res.json({ customers, pagination: paginationMeta(total, page, limit) });
  } catch (err) {
    console.error('[getCustomers]', err);
    return res.status(500).json({ message: 'Failed to fetch customers' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   GET /api/customers/:id
───────────────────────────────────────────────────────────────────── */
const getCustomer = async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, business_id: req.user.businessId },
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    return res.json({ customer });
  } catch (err) {
    console.error('[getCustomer]', err);
    return res.status(500).json({ message: 'Failed to fetch customer' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/customers
───────────────────────────────────────────────────────────────────── */
const createCustomer = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { name, phone, email, gstin, address, city, state } = req.body;
    const customer = await prisma.customer.create({
      data: {
        name, phone, email, gstin, address, city, state,
        business_id: req.user.businessId,
      },
    });
    return res.status(201).json({ message: 'Customer created', customer });
  } catch (err) {
    console.error('[createCustomer]', err);
    return res.status(500).json({ message: 'Failed to create customer' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   PUT /api/customers/:id
───────────────────────────────────────────────────────────────────── */
const updateCustomer = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, business_id: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Customer not found' });

    const { name, phone, email, gstin, address, city, state } = req.body;
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data:  { name, phone, email, gstin, address, city, state },
    });
    return res.json({ message: 'Customer updated', customer });
  } catch (err) {
    console.error('[updateCustomer]', err);
    return res.status(500).json({ message: 'Failed to update customer' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   DELETE /api/customers/:id
───────────────────────────────────────────────────────────────────── */
const deleteCustomer = async (req, res) => {
  try {
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, business_id: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Customer not found' });

    // Check for existing invoices
    const invoiceCount = await prisma.invoice.count({ where: { customer_id: req.params.id } });
    if (invoiceCount > 0)
      return res.status(400).json({
        message: `Cannot delete — customer has ${invoiceCount} invoice(s). Archive instead.`,
      });

    await prisma.customer.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('[deleteCustomer]', err);
    return res.status(500).json({ message: 'Failed to delete customer' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   GET /api/customers/:id/invoices — purchase history
───────────────────────────────────────────────────────────────────── */
const getCustomerInvoices = async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, business_id: req.user.businessId },
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const invoices = await prisma.invoice.findMany({
      where:   { customer_id: req.params.id, business_id: req.user.businessId },
      include: { items: { select: { name: true, qty: true, total: true } } },
      orderBy: { created_at: 'desc' },
    });

    const totalSpent = invoices
      .filter(i => i.status === 'PAID')
      .reduce((s, i) => s + i.total, 0);

    return res.json({ customer, invoices, totalSpent: Math.round(totalSpent * 100) / 100 });
  } catch (err) {
    console.error('[getCustomerInvoices]', err);
    return res.status(500).json({ message: 'Failed to fetch invoices' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   GET /api/customers/:id/balance — outstanding amount
───────────────────────────────────────────────────────────────────── */
const getCustomerBalance = async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, business_id: req.user.businessId },
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Outstanding = total of SENT/DRAFT invoices minus payments
    const unpaidInvoices = await prisma.invoice.findMany({
      where:   { customer_id: req.params.id, status: { in: ['SENT', 'DRAFT'] } },
      include: { payments: true },
    });

    let outstanding = 0;
    unpaidInvoices.forEach((inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      outstanding += inv.total - paid;
    });

    return res.json({
      customer:    { id: customer.id, name: customer.name },
      balance:     Math.round(outstanding * 100) / 100,
      invoiceCount: unpaidInvoices.length,
    });
  } catch (err) {
    console.error('[getCustomerBalance]', err);
    return res.status(500).json({ message: 'Failed to fetch balance' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/customers/:id/payment — record payment against oldest invoice
───────────────────────────────────────────────────────────────────── */
const recordCustomerPayment = async (req, res) => {
  try {
    const { amount, method, reference, notes } = req.body;
    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ message: 'Valid amount required' });

    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, business_id: req.user.businessId },
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Find oldest unpaid invoice
    const invoice = await prisma.invoice.findFirst({
      where:   { customer_id: req.params.id, status: { in: ['SENT', 'DRAFT'] } },
      include: { payments: true },
      orderBy: { created_at: 'asc' },
    });

    if (!invoice)
      return res.status(400).json({ message: 'No outstanding invoices found' });

    const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = invoice.total - totalPaid;
    const payAmt    = Math.min(Number(amount), remaining);

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: { invoice_id: invoice.id, amount: payAmt, method: method || 'CASH', reference, notes },
      });
      if (payAmt >= remaining - 0.01) {
        await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID' } });
      }
      // Update customer balance
      await tx.customer.update({
        where: { id: req.params.id },
        data:  { balance: { decrement: payAmt } },
      });
      return p;
    });

    return res.status(201).json({
      message: `Payment of ₹${payAmt} recorded against ${invoice.invoice_no}`,
      payment,
    });
  } catch (err) {
    console.error('[recordCustomerPayment]', err);
    return res.status(500).json({ message: 'Failed to record payment' });
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerInvoices,
  getCustomerBalance,
  recordCustomerPayment,
};