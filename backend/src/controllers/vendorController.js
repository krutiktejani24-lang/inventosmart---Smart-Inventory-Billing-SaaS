const prisma = require('../config/prisma');
const { validationResult } = require('express-validator');
const { paginate, paginationMeta, generateRefNo } = require('../utils/helpers');

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ message: 'Validation failed', errors: errors.array() });
    return false;
  }
  return true;
};

/* ─────────────────────────────────────────────────────────────────────
   VENDOR CRUD
───────────────────────────────────────────────────────────────────── */

/**
 * GET /api/vendors
 */
const getVendors = async (req, res) => {
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

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      prisma.vendor.count({ where }),
    ]);

    return res.json({ vendors, pagination: paginationMeta(total, page, limit) });
  } catch (err) {
    console.error('[getVendors]', err);
    return res.status(500).json({ message: 'Failed to fetch vendors' });
  }
};

/**
 * GET /api/vendors/:id
 */
const getVendor = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findFirst({
      where: { id: req.params.id, business_id: req.user.businessId },
    });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    return res.json({ vendor });
  } catch (err) {
    console.error('[getVendor]', err);
    return res.status(500).json({ message: 'Failed to fetch vendor' });
  }
};

/**
 * POST /api/vendors
 */
const createVendor = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { name, phone, email, gstin, address } = req.body;
    const vendor = await prisma.vendor.create({
      data: { name, phone, email, gstin, address, business_id: req.user.businessId },
    });
    return res.status(201).json({ message: 'Vendor created', vendor });
  } catch (err) {
    console.error('[createVendor]', err);
    return res.status(500).json({ message: 'Failed to create vendor' });
  }
};

/**
 * PUT /api/vendors/:id
 */
const updateVendor = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const existing = await prisma.vendor.findFirst({
      where: { id: req.params.id, business_id: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Vendor not found' });

    const { name, phone, email, gstin, address } = req.body;
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data:  { name, phone, email, gstin, address },
    });
    return res.json({ message: 'Vendor updated', vendor });
  } catch (err) {
    console.error('[updateVendor]', err);
    return res.status(500).json({ message: 'Failed to update vendor' });
  }
};

/**
 * DELETE /api/vendors/:id
 */
const deleteVendor = async (req, res) => {
  try {
    const existing = await prisma.vendor.findFirst({
      where: { id: req.params.id, business_id: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ message: 'Vendor not found' });

    const poCount = await prisma.purchaseOrder.count({ where: { vendor_id: req.params.id } });
    if (poCount > 0)
      return res.status(400).json({ message: `Cannot delete — vendor has ${poCount} purchase order(s)` });

    await prisma.vendor.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Vendor deleted' });
  } catch (err) {
    console.error('[deleteVendor]', err);
    return res.status(500).json({ message: 'Failed to delete vendor' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   PURCHASE ORDERS
───────────────────────────────────────────────────────────────────── */

/**
 * POST /api/purchase-orders
 * Body: { vendorId, items: [{ productId, qty, price }], notes }
 */
const createPurchaseOrder = async (req, res) => {
  try {
    const { vendorId, items = [], notes } = req.body;

    if (!vendorId)      return res.status(400).json({ message: 'Vendor ID is required' });
    if (!items.length)  return res.status(400).json({ message: 'At least one item required' });

    // Verify vendor belongs to business
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, business_id: req.user.businessId },
    });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Calculate total
    const total = items.reduce(
      (s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.qty) || 0),
      0
    );

    // Generate PO number
    const count  = await prisma.purchaseOrder.count({ where: { business_id: req.user.businessId } });
    const poNumber = generateRefNo('PO', new Date().getFullYear(), count + 1);

    const po = await prisma.$transaction(async (tx) => {
      const newPO = await tx.purchaseOrder.create({
        data: {
          po_number:   poNumber,
          vendor_id:   vendorId,
          business_id: req.user.businessId,
          total:       Math.round(total * 100) / 100,
          status:      'PENDING',
          notes:       notes || null,
          items: {
            create: items.map((item) => ({
              product_id: item.productId,
              qty:        parseInt(item.qty)    || 1,
              price:      parseFloat(item.price) || 0,
            })),
          },
        },
        include: { items: true, vendor: { select: { id: true, name: true } } },
      });
      return newPO;
    });

    return res.status(201).json({ message: 'Purchase order created', po });
  } catch (err) {
    console.error('[createPurchaseOrder]', err);
    return res.status(500).json({ message: 'Failed to create purchase order' });
  }
};

/**
 * GET /api/purchase-orders
 */
const getPurchaseOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, vendorId } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {
      business_id: req.user.businessId,
      ...(status   && { status }),
      ...(vendorId && { vendor_id: vendorId }),
    };

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true } },
          items:  { include: { product: { select: { id: true, name: true, unit: true } } } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return res.json({ purchase_orders: orders, pagination: paginationMeta(total, page, limit) });
  } catch (err) {
    console.error('[getPurchaseOrders]', err);
    return res.status(500).json({ message: 'Failed to fetch purchase orders' });
  }
};

/**
 * GET /api/purchase-orders/:id
 */
const getPurchaseOrder = async (req, res) => {
  try {
    const po = await prisma.purchaseOrder.findFirst({
      where:   { id: req.params.id, business_id: req.user.businessId },
      include: {
        vendor: true,
        items:  { include: { product: { select: { id: true, name: true, unit: true, stock_qty: true } } } },
      },
    });
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });
    return res.json({ po });
  } catch (err) {
    console.error('[getPurchaseOrder]', err);
    return res.status(500).json({ message: 'Failed to fetch purchase order' });
  }
};

/**
 * PUT /api/purchase-orders/:id/receive
 * Marks PO as RECEIVED and auto stock-in each item
 * Body: { items: [{ poItemId, receivedQty }] }  (optional partial receive)
 */
const receivePurchaseOrder = async (req, res) => {
  try {
    const po = await prisma.purchaseOrder.findFirst({
      where:   { id: req.params.id, business_id: req.user.businessId },
      include: { items: { include: { product: true } } },
    });

    if (!po)                    return res.status(404).json({ message: 'PO not found' });
    if (po.status === 'RECEIVED') return res.status(400).json({ message: 'PO already received' });
    if (po.status === 'CANCELLED') return res.status(400).json({ message: 'PO is cancelled' });

    const receivedItems = req.body.items; // optional partial receive

    await prisma.$transaction(async (tx) => {
      for (const poItem of po.items) {
        const qty = receivedItems
          ? receivedItems.find((i) => i.poItemId === poItem.id)?.receivedQty || poItem.qty
          : poItem.qty;

        if (!qty || qty <= 0) continue;

        // Stock IN
        const product = await tx.product.findUnique({ where: { id: poItem.product_id } });
        if (!product) continue;

        const afterQty = product.stock_qty + qty;

        await tx.product.update({
          where: { id: poItem.product_id },
          data:  { stock_qty: afterQty },
        });

        await tx.stockMovement.create({
          data: {
            product_id:   poItem.product_id,
            business_id:  req.user.businessId,
            type:         'IN',
            qty,
            before_qty:   product.stock_qty,
            after_qty:    afterQty,
            reason:       `Purchase Order: ${po.po_number}`,
            reference_id: po.id,
            created_by:   req.user.userId,
          },
        });

        // Update received qty on PO item
        await tx.pOItem.update({
          where: { id: poItem.id },
          data:  { received_qty: qty },
        });
      }

      // Mark PO as RECEIVED
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data:  { status: 'RECEIVED' },
      });
    });

    return res.json({ message: `PO ${po.po_number} received — stock updated for all items` });
  } catch (err) {
    console.error('[receivePurchaseOrder]', err);
    return res.status(500).json({ message: 'Failed to receive purchase order' });
  }
};

/**
 * PUT /api/purchase-orders/:id/cancel
 */
const cancelPurchaseOrder = async (req, res) => {
  try {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, business_id: req.user.businessId },
    });
    if (!po)                     return res.status(404).json({ message: 'PO not found' });
    if (po.status === 'RECEIVED') return res.status(400).json({ message: 'Cannot cancel a received PO' });

    await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: 'CANCELLED' } });
    return res.json({ message: 'Purchase order cancelled' });
  } catch (err) {
    console.error('[cancelPurchaseOrder]', err);
    return res.status(500).json({ message: 'Failed to cancel PO' });
  }
};

module.exports = {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
};