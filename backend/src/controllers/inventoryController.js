const { validationResult } = require('express-validator');
const csv = require('csv-parse/sync');
const service = require('../services/inventoryService');
const { createAuditLog } = require('../services/auditLogService');
const { createNotification } = require('../services/notificationService');

/* ─────────────────────────────────────────────────────────────────────
   HELPER — validation error response
───────────────────────────────────────────────────────────────────── */
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ message: 'Validation failed', errors: errors.array() });
    return false;
  }
  return true;
};

/* ─────────────────────────────────────────────────────────────────────
   PRODUCTS
───────────────────────────────────────────────────────────────────── */

/**
 * GET /api/products
 * Query: page, limit, search, categoryId
 */
const getProducts = async (req, res) => {
  try {
    const { page, limit, search, categoryId } = req.query;
    const data = await service.getProducts(req.user.businessId, {
      page, limit, search, categoryId,
    });
    return res.json(data);
  } catch (err) {
    console.error('[getProducts]', err);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
};

/**
 * GET /api/products/:id
 */
const getProduct = async (req, res) => {
  try {
    const product = await service.getProductById(req.params.id, req.user.businessId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.json({ product });
  } catch (err) {
    console.error('[getProduct]', err);
    return res.status(500).json({ message: 'Failed to fetch product' });
  }
};

/**
 * POST /api/products
 */
const createProduct = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const {
      name, sku, hsn_code, description,
      price, cost_price, stock_qty, min_threshold,
      unit, gst_rate, image_url, category_id,
    } = req.body;

    const product = await service.createProduct(req.user.businessId, {
      name, sku, hsn_code, description,
      price:         parseFloat(price)         || 0,
      cost_price:    parseFloat(cost_price)    || 0,
      stock_qty:     parseInt(stock_qty)       || 0,
      min_threshold: parseInt(min_threshold)   || 5,
      unit:          unit || 'Pcs',
      gst_rate:      parseFloat(gst_rate)      || 18,
      image_url:     image_url || null,
      category_id:   category_id || null,
    });

try {
  await createAuditLog(
    businessId,
    req.user?.id,
    'CREATE_PRODUCT',
    'INVENTORY'
  );
} catch (err) {
  console.log('Audit Log Error:', err.message);
}

    return res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    console.error('[createProduct]', err);
    return res.status(500).json({
      message: 'Failed to create product',
      error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }
};

/**
 * PUT /api/products/:id
 */
const updateProduct = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const product = await service.updateProduct(
      req.params.id,
      req.user.businessId,
      req.body
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });

      await createAuditLog(
       req.user.businessId,
       req.user.userId,
        'Updated Product',
        'Inventory'
      );

    return res.json({ message: 'Product updated', product });
  } catch (err) {
    console.error('[updateProduct]', err);
    return res.status(500).json({ message: 'Failed to update product' });
  }
};

/**
 * DELETE /api/products/:id  (soft delete)
 */
const deleteProduct = async (req, res) => {
  try {
    const product = await service.deleteProduct(req.params.id, req.user.businessId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
      
      await createAuditLog(
        req.user.businessId,
        req.user.userId,
        'Deleted Product',
        'Inventory'
      );

    return res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('[deleteProduct]', err);
    return res.status(500).json({ message: 'Failed to delete product' });
  }
};

/**
 * GET /api/products/low-stock
 */
const getLowStock = async (req, res) => {
  try {
    const products = await service.getLowStockProducts(req.user.businessId);
    return res.json({ products, count: products.length });
  } catch (err) {
    console.error('[getLowStock]', err);
    return res.status(500).json({ message: 'Failed to fetch low stock products' });
  }
};

/**
 * POST /api/products/import-csv
 * multipart/form-data — file field: "csv"
 * OR raw CSV text in req.body.csv
 */
const importCSV = async (req, res) => {
  try {
    let csvText = '';

    // Raw body thi aave (Thunder Client / Postman)
    if (req.body.csv) {
      csvText = req.body.csv;
    }
    // Uploaded file (multer)
    else if (req.file) {
      csvText = req.file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({
        message: 'No CSV provided. Send "csv" in body or upload a file.',
      });
    }

    // Parse CSV — header row required
    const rows = csv.parse(csvText, {
      columns:          true,
      skip_empty_lines: true,
      trim:             true,
    });

    if (!rows.length)
      return res.status(400).json({ message: 'CSV is empty or has no data rows' });

    const result = await service.bulkImportProducts(req.user.businessId, rows);
    await createAuditLog(
  req.user.businessId,
  req.user.userId,
  `Imported ${result.created} products`,
  'Inventory'
);

    return res.status(201).json({
      message: `Import complete — ${result.created} created, ${result.skipped} skipped`,
      ...result,
    });
  } catch (err) {
    console.error('[importCSV]', err);
    if (err.code === 'CSV_RECORD_INCONSISTENT_FIELDS_LENGTH')
      return res.status(400).json({ message: 'Invalid CSV format — check column headers' });
    return res.status(500).json({ message: 'Failed to import CSV' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   STOCK MOVEMENTS
───────────────────────────────────────────────────────────────────── */

/**
 * POST /api/inventory/stock-in
 * Body: { productId, qty, reason, referenceId }
 */
const stockIn = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { productId, qty, reason, referenceId } = req.body;

    const result = await service.stockIn(
      req.user.businessId,
      productId,
      parseInt(qty),
      reason,
      referenceId,
      req.user.userId
    );

    await createAuditLog(
  req.user.businessId,
  req.user.userId,
  `Added ${qty} stock`,
  'Inventory'
);

    return res.status(200).json({
      message: `Stock added. New qty: ${result.product.stock_qty}`,
      ...result,
    });
  } catch (err) {
    console.error('[stockIn]', err);
    const status = err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ message: err.message });
  }
};

/**
 * POST /api/inventory/stock-out
 * Body: { productId, qty, reason, referenceId }
 */
const stockOut = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { productId, qty, reason, referenceId } = req.body;

    const result = await service.stockOut(
      req.user.businessId,
      productId,
      parseInt(qty),
      reason,
      referenceId,
      req.user.userId
    );

    await createAuditLog(
  req.user.businessId,
  req.user.userId,
  `Removed ${qty} stock`,
  'Inventory'
);

    return res.status(200).json({
      message: `Stock deducted. New qty: ${result.product.stock_qty}`,
      ...result,
    });
  } catch (err) {
    console.error('[stockOut]', err);
    const status = err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ message: err.message });
  }
};

/**
 * GET /api/inventory/movements/:productId
 * Query: page, limit
 */
const getMovements = async (req, res) => {
  try {
    const data = await service.getMovements(
      req.params.productId,
      req.user.businessId,
      req.query
    );
    if (!data) return res.status(404).json({ message: 'Product not found' });
    return res.json(data);
  } catch (err) {
    console.error('[getMovements]', err);
    return res.status(500).json({ message: 'Failed to fetch movements' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   CATEGORIES
───────────────────────────────────────────────────────────────────── */

const getCategories = async (req, res) => {
  try {
    const categories = await service.getCategories(req.user.businessId);
    return res.json({ categories });
  } catch (err) {
    console.error('[getCategories]', err);
    return res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: 'Category name is required' });

    const category = await service.createCategory(req.user.businessId, name.trim());
    await createAuditLog(
  req.user.businessId,
  req.user.userId,
  'Created Category',
  'Inventory'
);
    return res.status(201).json({ message: 'Category created', category });
  } catch (err) {
    console.error('[createCategory]', err);
    return res.status(500).json({ message: 'Failed to create category' });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStock,
  importCSV,
  stockIn,
  stockOut,
  getMovements,
  getCategories,
  createCategory,
};