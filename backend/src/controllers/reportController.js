const { PrismaClient } = require('@prisma/client');
const PDFDocument      = require('pdfkit');
const ExcelJS          = require('exceljs');

const prisma = new PrismaClient();

/* ─────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────── */
const fmt  = (n) => Number((n || 0).toFixed(2));
const fmtI = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);

/** Date range — default last 30 days */
const parseDateRange = (from, to) => {
  const end   = to   ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return { start, end };
};

/** Send PDF buffer */
const sendPDF = (res, title, rows, columns) => {
  const doc    = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  doc.on('end', () => {
    const buf = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`);
    res.end(buf);
  });

  // Header
  doc.rect(40, 40, 515, 50).fill('#1e40af');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16)
    .text(title, 55, 52);
  doc.font('Helvetica').fontSize(9).fillColor('#bfdbfe')
    .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 55, 72);

  // Table header
  let y = 115;
  const colW = Math.floor(515 / columns.length);
  doc.rect(40, y, 515, 18).fill('#1e40af');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
  columns.forEach((col, i) => doc.text(col, 40 + i * colW, y + 5, { width: colW, align: i > 0 ? 'right' : 'left' }));
  y += 18;

  // Rows
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? '#ffffff' : '#f8fafc';
    doc.rect(40, y, 515, 16).fill(bg);
    doc.fillColor('#0f172a').font('Helvetica').fontSize(8);
    row.forEach((cell, i) => doc.text(String(cell ?? ''), 40 + i * colW, y + 4, { width: colW, align: i > 0 ? 'right' : 'left' }));
    y += 16;
    if (y > 760) { doc.addPage(); y = 40; }
  });

  doc.end();
};

/** Send Excel buffer */
const sendExcel = async (res, sheetName, headers, rows) => {
  const wb   = new ExcelJS.Workbook();
  const ws   = wb.addWorksheet(sheetName);

  // Header style
  ws.columns = headers.map((h) => ({ header: h, key: h, width: 20 }));
  ws.getRow(1).eachCell((cell) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e40af' } };
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFbfdbfe' } } };
  });

  // Data rows
  rows.forEach((row, i) => {
    const r = ws.addRow(row);
    r.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFffffff' : 'FFf8fafc' } };
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${sheetName}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
};

/* ─────────────────────────────────────────────────────────────────────
   1. GET /api/reports/dashboard
   Today stats + weekly sales chart data
───────────────────────────────────────────────────────────────────── */
const getDashboard = async (req, res) => {
  try {
    const bId      = req.user.businessId;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    // Today's paid invoices
    const todayInvoices = await prisma.invoice.findMany({
      where: { business_id: bId, status: 'PAID', created_at: { gte: todayStart, lte: todayEnd } },
      select: { total: true },
    });
    const todaySales = todayInvoices.reduce((s, i) => s + i.total, 0);

    // Total products
    const totalProducts = await prisma.product.count({
      where: { business_id: bId, is_active: true },
    });

    // Pending invoices
    const pendingInvoices = await prisma.invoice.count({
      where: { business_id: bId, status: { in: ['SENT', 'DRAFT'] } },
    });

    // Low stock
    const allProducts = await prisma.product.findMany({
      where: { business_id: bId, is_active: true },
      select: { stock_qty: true, min_threshold: true },
    });
    const lowStockCount = allProducts.filter((p) => p.stock_qty < p.min_threshold).length;

    // Weekly sales — last 7 days
    const weeklyData = [];
    for (let d = 6; d >= 0; d--) {
      const dayStart = new Date(); dayStart.setDate(dayStart.getDate() - d); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(); dayEnd.setDate(dayEnd.getDate() - d);     dayEnd.setHours(23, 59, 59, 999);

      const dayInvoices = await prisma.invoice.findMany({
        where: { business_id: bId, status: 'PAID', created_at: { gte: dayStart, lte: dayEnd } },
        select: { total: true },
      });
      const daySales = dayInvoices.reduce((s, i) => s + i.total, 0);

      weeklyData.push({
        day:   dayStart.toLocaleDateString('en-IN', { weekday: 'short' }),
        date:  dayStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        sales: fmt(daySales),
      });
    }

    // Recent 5 invoices
    const recentInvoices = await prisma.invoice.findMany({
      where:   { business_id: bId },
      include: { customer: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
      take:    5,
    });

    return res.json({
      stats: {
        todaySales:      fmt(todaySales),
        totalProducts,
        pendingInvoices,
        lowStockCount,
        salesTrend:      12, // placeholder — can compute vs last week
      },
      weeklyData,
      recentInvoices,
    });
  } catch (err) {
    console.error('[getDashboard]', err);
    return res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   2. GET /api/reports/sales?from=&to=&format=
───────────────────────────────────────────────────────────────────── */
const getSalesReport = async (req, res) => {
  try {
    const bId = req.user.businessId;
    const { start, end } = parseDateRange(req.query.from, req.query.to);
    const { format } = req.query;

    const invoices = await prisma.invoice.findMany({
      where:   { business_id: bId, status: 'PAID', created_at: { gte: start, lte: end } },
      include: { customer: { select: { name: true } }, items: true },
      orderBy: { created_at: 'asc' },
    });

    const totalRevenue  = invoices.reduce((s, i) => s + i.total, 0);
    const totalTax      = invoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
    const totalDiscount = invoices.reduce((s, i) => s + i.discount, 0);

    const data = {
      period:        { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) },
      summary:       { invoiceCount: invoices.length, totalRevenue: fmt(totalRevenue), totalTax: fmt(totalTax), totalDiscount: fmt(totalDiscount) },
      invoices:      invoices.map((inv) => ({
        invoice_no:   inv.invoice_no,
        date:         inv.created_at.toISOString().slice(0, 10),
        customer:     inv.customer?.name,
        subtotal:     fmt(inv.subtotal),
        discount:     fmt(inv.discount),
        cgst:         fmt(inv.cgst),
        sgst:         fmt(inv.sgst),
        igst:         fmt(inv.igst),
        total:        fmt(inv.total),
      })),
    };

    if (format === 'pdf') {
      return sendPDF(res, 'Sales Report', data.invoices.map((r) => [
        r.invoice_no, r.date, r.customer, `₹${fmtI(r.subtotal)}`,
        `₹${fmtI(r.cgst)}`, `₹${fmtI(r.sgst)}`, `₹${fmtI(r.igst)}`, `₹${fmtI(r.total)}`,
      ]), ['Invoice#', 'Date', 'Customer', 'Subtotal', 'CGST', 'SGST', 'IGST', 'Total']);
    }

    if (format === 'excel') {
      return sendExcel(res, 'Sales Report',
        ['Invoice#', 'Date', 'Customer', 'Subtotal', 'Discount', 'CGST', 'SGST', 'IGST', 'Total'],
        data.invoices.map((r) => [r.invoice_no, r.date, r.customer, r.subtotal, r.discount, r.cgst, r.sgst, r.igst, r.total])
      );
    }

    return res.json(data);
  } catch (err) {
    console.error('[getSalesReport]', err);
    return res.status(500).json({ message: 'Failed to generate sales report' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   3. GET /api/reports/profit-loss?from=&to=&format=
───────────────────────────────────────────────────────────────────── */
const getProfitLoss = async (req, res) => {
  try {
    const bId = req.user.businessId;
    const { start, end } = parseDateRange(req.query.from, req.query.to);
    const { format } = req.query;

    // Revenue — paid invoices
    const invoices = await prisma.invoice.findMany({
      where:   { business_id: bId, status: 'PAID', created_at: { gte: start, lte: end } },
      include: { items: { include: { product: { select: { cost_price: true } } } } },
    });

    let totalRevenue = 0;
    let totalCOGS    = 0;

    const rows = invoices.map((inv) => {
      const revenue = inv.subtotal;
      const cogs    = inv.items.reduce((s, item) => s + (item.product?.cost_price || 0) * item.qty, 0);
      const profit  = revenue - cogs;
      totalRevenue += revenue;
      totalCOGS    += cogs;
      return {
        invoice_no: inv.invoice_no,
        date:       inv.created_at.toISOString().slice(0, 10),
        revenue:    fmt(revenue),
        cogs:       fmt(cogs),
        gross_profit: fmt(profit),
        margin_pct: revenue > 0 ? fmt((profit / revenue) * 100) : 0,
      };
    });

    const grossProfit = totalRevenue - totalCOGS;

    const data = {
      period:  { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) },
      summary: {
        totalRevenue:   fmt(totalRevenue),
        totalCOGS:      fmt(totalCOGS),
        grossProfit:    fmt(grossProfit),
        grossMarginPct: totalRevenue > 0 ? fmt((grossProfit / totalRevenue) * 100) : 0,
      },
      rows,
    };

    if (format === 'pdf') {
      return sendPDF(res, 'Profit & Loss', rows.map((r) => [
        r.invoice_no, r.date, `₹${fmtI(r.revenue)}`, `₹${fmtI(r.cogs)}`,
        `₹${fmtI(r.gross_profit)}`, `${r.margin_pct}%`,
      ]), ['Invoice#', 'Date', 'Revenue', 'COGS', 'Gross Profit', 'Margin%']);
    }

    if (format === 'excel') {
      return sendExcel(res, 'Profit & Loss',
        ['Invoice#', 'Date', 'Revenue', 'COGS', 'Gross Profit', 'Margin%'],
        rows.map((r) => [r.invoice_no, r.date, r.revenue, r.cogs, r.gross_profit, r.margin_pct])
      );
    }

    return res.json(data);
  } catch (err) {
    console.error('[getProfitLoss]', err);
    return res.status(500).json({ message: 'Failed to generate P&L report' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   4. GET /api/reports/inventory-valuation
───────────────────────────────────────────────────────────────────── */
const getInventoryValuation = async (req, res) => {
  try {
    const bId = req.user.businessId;
    const { format } = req.query;

    const products = await prisma.product.findMany({
      where:   { business_id: bId, is_active: true },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    const rows = products.map((p) => ({
      name:           p.name,
      sku:            p.sku || '—',
      category:       p.category?.name || 'Uncategorized',
      stock_qty:      p.stock_qty,
      unit:           p.unit,
      cost_price:     fmt(p.cost_price),
      selling_price:  fmt(p.price),
      stock_value:    fmt(p.cost_price * p.stock_qty),
      potential_rev:  fmt(p.price * p.stock_qty),
    }));

    const totalStockValue = rows.reduce((s, r) => s + r.stock_value, 0);
    const totalPotential  = rows.reduce((s, r) => s + r.potential_rev, 0);

    if (format === 'pdf') {
      return sendPDF(res, 'Inventory Valuation', rows.map((r) => [
        r.name, r.sku, r.category, `${r.stock_qty} ${r.unit}`,
        `₹${fmtI(r.cost_price)}`, `₹${fmtI(r.stock_value)}`,
      ]), ['Product', 'SKU', 'Category', 'Stock', 'Cost Price', 'Stock Value']);
    }

    if (format === 'excel') {
      return sendExcel(res, 'Inventory Valuation',
        ['Product', 'SKU', 'Category', 'Stock Qty', 'Unit', 'Cost Price', 'Selling Price', 'Stock Value', 'Potential Revenue'],
        rows.map((r) => [r.name, r.sku, r.category, r.stock_qty, r.unit, r.cost_price, r.selling_price, r.stock_value, r.potential_rev])
      );
    }

    return res.json({
      summary: {
        totalProducts:   products.length,
        totalStockValue: fmt(totalStockValue),
        totalPotentialRevenue: fmt(totalPotential),
      },
      rows,
    });
  } catch (err) {
    console.error('[getInventoryValuation]', err);
    return res.status(500).json({ message: 'Failed to generate inventory valuation' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   5. GET /api/reports/gstr1?month=5&year=2025&format=
   GSTR-1 — B2B and B2C invoice summary
───────────────────────────────────────────────────────────────────── */
const getGSTR1 = async (req, res) => {
  try {
    const bId  = req.user.businessId;
    const { format } = req.query;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where:   { business_id: bId, status: 'PAID', created_at: { gte: start, lte: end } },
      include: { customer: true, items: true },
      orderBy: { created_at: 'asc' },
    });

    // B2B — customers with GSTIN
    const b2b = invoices
      .filter((i) => i.customer?.gstin)
      .map((inv) => ({
        gstin:        inv.customer.gstin,
        customer:     inv.customer.name,
        invoice_no:   inv.invoice_no,
        invoice_date: inv.created_at.toISOString().slice(0, 10),
        invoice_value: fmt(inv.total),
        place_of_supply: inv.place_of_supply || inv.customer?.state || '',
        reverse_charge: 'N',
        taxable_value:  fmt(inv.subtotal),
        cgst:           fmt(inv.cgst),
        sgst:           fmt(inv.sgst),
        igst:           fmt(inv.igst),
      }));

    // B2C — customers without GSTIN
    const b2c = invoices.filter((i) => !i.customer?.gstin);
    const b2cSummary = {
      total_invoices: b2c.length,
      taxable_value:  fmt(b2c.reduce((s, i) => s + i.subtotal, 0)),
      cgst:           fmt(b2c.reduce((s, i) => s + i.cgst, 0)),
      sgst:           fmt(b2c.reduce((s, i) => s + i.sgst, 0)),
      igst:           fmt(b2c.reduce((s, i) => s + i.igst, 0)),
      total:          fmt(b2c.reduce((s, i) => s + i.total, 0)),
    };

    const data = {
      period:     { month, year },
      b2b,
      b2c_summary: b2cSummary,
      totals: {
        totalInvoices:  invoices.length,
        totalTaxable:   fmt(invoices.reduce((s, i) => s + i.subtotal, 0)),
        totalCGST:      fmt(invoices.reduce((s, i) => s + i.cgst, 0)),
        totalSGST:      fmt(invoices.reduce((s, i) => s + i.sgst, 0)),
        totalIGST:      fmt(invoices.reduce((s, i) => s + i.igst, 0)),
        totalTax:       fmt(invoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0)),
        grandTotal:     fmt(invoices.reduce((s, i) => s + i.total, 0)),
      },
    };

    if (format === 'excel') {
      return sendExcel(res, `GSTR1_${month}_${year}`,
        ['GSTIN', 'Customer', 'Invoice#', 'Date', 'Invoice Value', 'Place of Supply', 'Taxable Value', 'CGST', 'SGST', 'IGST'],
        b2b.map((r) => [r.gstin, r.customer, r.invoice_no, r.invoice_date, r.invoice_value, r.place_of_supply, r.taxable_value, r.cgst, r.sgst, r.igst])
      );
    }

    if (format === 'pdf') {
      return sendPDF(res, `GSTR-1 — ${month}/${year}`, b2b.map((r) => [
        r.gstin, r.customer, r.invoice_no, r.invoice_date,
        `₹${fmtI(r.taxable_value)}`, `₹${fmtI(r.cgst)}`, `₹${fmtI(r.sgst)}`, `₹${fmtI(r.igst)}`,
      ]), ['GSTIN', 'Customer', 'Invoice#', 'Date', 'Taxable', 'CGST', 'SGST', 'IGST']);
    }

    return res.json(data);
  } catch (err) {
    console.error('[getGSTR1]', err);
    return res.status(500).json({ message: 'Failed to generate GSTR-1' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   6. GET /api/reports/top-products?limit=10&format=
───────────────────────────────────────────────────────────────────── */
const getTopProducts = async (req, res) => {
  try {
    const bId   = req.user.businessId;
    const limit = parseInt(req.query.limit) || 10;
    const { format } = req.query;
    const { start, end } = parseDateRange(req.query.from, req.query.to);

    // Aggregate invoice_items by product
    const items = await prisma.invoiceItem.findMany({
      where: {
        invoice: { business_id: bId, status: 'PAID', created_at: { gte: start, lte: end } },
      },
      include: { product: { select: { name: true, sku: true, unit: true } } },
    });

    // Group by product name (some items may have no product link)
    const map = {};
    items.forEach((item) => {
      const key  = item.product_id || item.name;
      const name = item.product?.name || item.name;
      if (!map[key]) map[key] = { name, sku: item.product?.sku || '—', unit: item.product?.unit || 'Pcs', qty: 0, revenue: 0 };
      map[key].qty     += item.qty;
      map[key].revenue += item.total;
    });

    const rows = Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, ...r, revenue: fmt(r.revenue) }));

    if (format === 'pdf') {
      return sendPDF(res, 'Top Products', rows.map((r) => [
        r.rank, r.name, r.sku, `${r.qty} ${r.unit}`, `₹${fmtI(r.revenue)}`,
      ]), ['#', 'Product', 'SKU', 'Qty Sold', 'Revenue']);
    }

    if (format === 'excel') {
      return sendExcel(res, 'Top Products',
        ['Rank', 'Product', 'SKU', 'Qty Sold', 'Unit', 'Revenue'],
        rows.map((r) => [r.rank, r.name, r.sku, r.qty, r.unit, r.revenue])
      );
    }

    return res.json({ rows });
  } catch (err) {
    console.error('[getTopProducts]', err);
    return res.status(500).json({ message: 'Failed to fetch top products' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   7. GET /api/reports/low-stock?format=
───────────────────────────────────────────────────────────────────── */
const getLowStockReport = async (req, res) => {
  try {
    const bId = req.user.businessId;
    const { format } = req.query;

    const products = await prisma.product.findMany({
      where:   { business_id: bId, is_active: true },
      include: { category: { select: { name: true } } },
      orderBy: { stock_qty: 'asc' },
    });

    const rows = products
      .filter((p) => p.stock_qty < p.min_threshold)
      .map((p) => ({
        name:          p.name,
        sku:           p.sku || '—',
        category:      p.category?.name || 'Uncategorized',
        stock_qty:     p.stock_qty,
        min_threshold: p.min_threshold,
        to_order:      p.min_threshold - p.stock_qty,
        unit:          p.unit,
        cost_price:    fmt(p.cost_price),
        reorder_value: fmt((p.min_threshold - p.stock_qty) * p.cost_price),
      }));

    if (format === 'pdf') {
      return sendPDF(res, 'Low Stock Report', rows.map((r) => [
        r.name, r.sku, `${r.stock_qty} ${r.unit}`, `${r.min_threshold} ${r.unit}`,
        `${r.to_order} ${r.unit}`, `₹${fmtI(r.reorder_value)}`,
      ]), ['Product', 'SKU', 'Current Stock', 'Min Required', 'To Order', 'Reorder Value']);
    }

    if (format === 'excel') {
      return sendExcel(res, 'Low Stock',
        ['Product', 'SKU', 'Category', 'Current Stock', 'Min Threshold', 'To Order', 'Unit', 'Cost Price', 'Reorder Value'],
        rows.map((r) => [r.name, r.sku, r.category, r.stock_qty, r.min_threshold, r.to_order, r.unit, r.cost_price, r.reorder_value])
      );
    }

    return res.json({ count: rows.length, rows });
  } catch (err) {
    console.error('[getLowStockReport]', err);
    return res.status(500).json({ message: 'Failed to fetch low stock report' });
  }
};

module.exports = {
  getDashboard,
  getSalesReport,
  getProfitLoss,
  getInventoryValuation,
  getGSTR1,
  getTopProducts,
  getLowStockReport,
};