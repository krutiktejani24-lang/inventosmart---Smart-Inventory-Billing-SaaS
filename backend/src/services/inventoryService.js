const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createNotification } = require('./notificationService');
/* ─────────────────────────────────────────────────────────────────────
   PRODUCT SERVICES
───────────────────────────────────────────────────────────────────── */

/**
 * Paginated product list with search + category filter
 * @param {string} businessId
 * @param {object} options - page, limit, search, categoryId, lowStock
 */
const getProducts = async (businessId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    categoryId,
    lowStock = false,
  } = options;

  const skip = (page - 1) * limit;

  const where = {
    business_id: businessId,
    is_active: true,
    ...(search && {
      OR: [
        { name:     { contains: search, mode: 'insensitive' } },
        { sku:      { contains: search, mode: 'insensitive' } },
        { hsn_code: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(categoryId && { category_id: categoryId }),
    ...(lowStock   && { stock_qty: { lt: prisma.product.fields.min_threshold } }),
  };

  // lowStock raw comparison (Prisma field reference workaround)
  const whereRaw = lowStock
    ? { ...where, stock_qty: undefined }
    : where;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: lowStock
        ? { ...where, stock_qty: undefined }
        : where,
      ...(lowStock && {
        where: {
          business_id: businessId,
          is_active: true,
          ...(search && {
            OR: [
              { name:     { contains: search, mode: 'insensitive' } },
              { sku:      { contains: search, mode: 'insensitive' } },
              { hsn_code: { contains: search, mode: 'insensitive' } },
            ],
          }),
          ...(categoryId && { category_id: categoryId }),
        },
      }),
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: Number(limit),
    }),
    prisma.product.count({ where }),
  ]);

  // lowStock filter in JS (safe cross-DB way)
  const result = lowStock
    ? products.filter((p) => p.stock_qty < p.min_threshold)
    : products;

  return {
    products: result,
    pagination: {
      total,
      page:       Number(page),
      limit:      Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Single product by ID (business-scoped)
 */
const getProductById = async (id, businessId) => {
  return prisma.product.findFirst({
    where: { id, business_id: businessId, is_active: true },
    include: { category: { select: { id: true, name: true } } },
  });
};

/**
 * Create new product — auto-generate SKU if not provided
 */
const createProduct = async (businessId, data) => {

  const subscription = await prisma.subscription.findFirst({
  where: {
    business_id: businessId,
    status: 'ACTIVE'
  },
  include: {
    plan: true
  }
});

const productCount = await prisma.product.count({
  where: {
    business_id: businessId,
    is_active: true
  }
});

if (
  subscription?.plan?.max_products !== -1 &&
  productCount >= subscription.plan.max_products
) {
  throw new Error(
    `Product limit reached. Upgrade your plan.`
  );
}

  const sku = data.sku || await generateSKU(businessId, data.name);

  const product = await prisma.product.create({
  data: {
    name: data.name,
    sku,
    hsn_code: data.hsn_code || null,
    description: data.description || null,
    price: Number(data.price) || 0,
    cost_price: Number(data.cost_price) || 0,
    stock_qty: parseInt(data.stock_qty) || 0,
    min_threshold: parseInt(data.min_threshold) || 5,
    unit: data.unit || 'Pcs',
    gst_rate: Number(data.gst_rate) || 18,
    image_url: data.image_url || null,
    category_id: data.category_id || null,
    is_active: true,
    business_id: businessId,
  },
  include: {
    category: {
      select: {
        id: true,
        name: true,
      },
    },
  },
});

if (product.stock_qty <= product.min_threshold) {
  await createNotification(
    businessId,
    'Low Stock Alert',
    `${product.name} stock is below threshold`
  );
}
}

/**
 * Update product
 */
const updateProduct = async (id, businessId, data) => {
  const product = await prisma.product.findFirst({
    where: { id, business_id: businessId, is_active: true },
  });
  if (!product) return null;

  return prisma.product.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true } } },
  });
};

/**
 * Soft delete — is_active = false
 */
const deleteProduct = async (id, businessId) => {
  const product = await prisma.product.findFirst({
    where: { id, business_id: businessId, is_active: true },
  });
  if (!product) return null;

  return prisma.product.update({
    where: { id },
    data:  { is_active: false },
  });
};

/**
 * Low stock products — stock_qty < min_threshold
 */
const getLowStockProducts = async (businessId) => {
  const products = await prisma.product.findMany({
    where:   { business_id: businessId, is_active: true },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { stock_qty: 'asc' },
  });
  return products.filter((p) => p.stock_qty < p.min_threshold);
};

/* ─────────────────────────────────────────────────────────────────────
   STOCK MOVEMENT SERVICES
───────────────────────────────────────────────────────────────────── */

/**
 * Stock IN — add stock to product
 * @param {string} businessId
 * @param {string} productId
 * @param {number} qty
 * @param {string} reason
 * @param {string} referenceId - po_id or manual
 * @param {string} createdBy   - user_id
 */
const stockIn = async (businessId, productId, qty, reason, referenceId, createdBy) => {
  return prisma.$transaction(async (tx) => {
    // Product lock karo
    const product = await tx.product.findFirst({
      where: { id: productId, business_id: businessId, is_active: true },
    });
    if (!product) throw new Error('Product not found');
    if (qty <= 0)  throw new Error('Quantity must be greater than 0');

    const afterQty = product.stock_qty + qty;

    // Stock update
    const updated = await tx.product.update({
      where: { id: productId },
      data:  { stock_qty: afterQty },
    });

    // Movement log
    const movement = await tx.stockMovement.create({
      data: {
        product_id:   productId,
        business_id:  businessId,
        type:         'IN',
        qty,
        before_qty:   product.stock_qty,
        after_qty:    afterQty,
        reason:       reason || 'Manual stock in',
        reference_id: referenceId || null,
        created_by:   createdBy  || null,
      },
    });

    return { product: updated, movement };
  });
};

/**
 * Stock OUT — deduct stock from product
 */
const stockOut = async (businessId, productId, qty, reason, referenceId, createdBy) => {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: productId, business_id: businessId, is_active: true },
    });
    if (!product) throw new Error('Product not found');
    if (qty <= 0)  throw new Error('Quantity must be greater than 0');
    if (product.stock_qty < qty)
      throw new Error(`Insufficient stock. Available: ${product.stock_qty} ${product.unit}`);

    const afterQty = product.stock_qty - qty;

    const updated = await tx.product.update({
      where: { id: productId },
      data:  { stock_qty: afterQty },
    });
    if (updated.stock_qty <= updated.min_threshold) {
  await createNotification(
    businessId,
    'Low Stock Alert',
    `${updated.name} stock is below threshold (${updated.stock_qty} remaining)`
  );
}s

    const movement = await tx.stockMovement.create({
      data: {
        product_id:   productId,
        business_id:  businessId,
        type:         'OUT',
        qty,
        before_qty:   product.stock_qty,
        after_qty:    afterQty,
        reason:       reason || 'Manual stock out',
        reference_id: referenceId || null,
        created_by:   createdBy  || null,
      },
    });

    return { product: updated, movement };
  });
};

/**
 * Stock movement history for a product (paginated)
 */
const getMovements = async (productId, businessId, options = {}) => {
  const { page = 1, limit = 30 } = options;
  const skip = (page - 1) * limit;

  // Verify product belongs to this business
  const product = await prisma.product.findFirst({
    where: { id: productId, business_id: businessId },
    select: { id: true, name: true, stock_qty: true, unit: true },
  });
  if (!product) return null;

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where:   { product_id: productId, business_id: businessId },
      orderBy: { created_at: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.stockMovement.count({
      where: { product_id: productId, business_id: businessId },
    }),
  ]);

  return {
    product,
    movements,
    pagination: {
      total,
      page:       Number(page),
      limit:      Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

/* ─────────────────────────────────────────────────────────────────────
   CATEGORY SERVICES
───────────────────────────────────────────────────────────────────── */

const getCategories = async (businessId) =>
  prisma.category.findMany({
    where:   { business_id: businessId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });

const createCategory = async (businessId, name) =>
  prisma.category.create({ data: { name, business_id: businessId } });

/* ─────────────────────────────────────────────────────────────────────
   CSV BULK IMPORT
───────────────────────────────────────────────────────────────────── */

/**
 * Bulk import products from parsed CSV rows
 * @param {string} businessId
 * @param {Array}  rows - array of product objects from CSV
 * @returns {{ created, skipped, errors }}
 */
const bulkImportProducts = async (businessId, rows) => {
  const results = { created: 0, skipped: 0, errors: [] };

  for (const [i, row] of rows.entries()) {
    try {
      if (!row.name) {
        results.errors.push({ row: i + 2, message: 'Name is required' });
        results.skipped++;
        continue;
      }

      // Duplicate SKU check
      if (row.sku) {
        const exists = await prisma.product.findFirst({
          where: { sku: row.sku, business_id: businessId },
        });
        if (exists) {
          results.errors.push({ row: i + 2, message: `SKU "${row.sku}" already exists` });
          results.skipped++;
          continue;
        }
      }

      await prisma.product.create({
        data: {
          name:          row.name?.trim(),
          sku:           row.sku?.trim()      || await generateSKU(businessId, row.name),
          hsn_code:      row.hsn_code?.trim() || null,
          description:   row.description?.trim() || null,
          price:         parseFloat(row.price)      || 0,
          cost_price:    parseFloat(row.cost_price)  || 0,
          stock_qty:     parseInt(row.stock_qty)     || 0,
          min_threshold: parseInt(row.min_threshold) || 5,
          unit:          row.unit?.trim()    || 'Pcs',
          gst_rate:      parseFloat(row.gst_rate)    || 18,
          business_id:   businessId,
        },
      });

      results.created++;
    } catch (err) {
      results.errors.push({ row: i + 2, message: err.message });
      results.skipped++;
    }
  }

  return results;
};

/* ─────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────── */

/**
 * Auto SKU — PRD-000001 format
 */
const generateSKU = async (businessId, name) => {
  const count = await prisma.product.count({ where: { business_id: businessId } });
  const prefix = (name || 'PRD').replace(/\s+/g, '').toUpperCase().slice(0, 3);
  return `${prefix}-${String(count + 1).padStart(5, '0')}`;
};

module.exports = {
  createNotification,
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  stockIn,
  stockOut,
  getMovements,
  getCategories,
  createCategory,
  bulkImportProducts,
};