const PDFDocument = require('pdfkit');
const { amountInWords } = require('../services/gstEngine');

/**
 * generateInvoicePDF
 * Indian GST Tax Invoice format — PDFKit
 * @param {object} invoice  - invoice with items, customer, business
 * @returns {Buffer}        - PDF buffer
 */
const generateInvoicePDF = (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc    = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data',  (c) => chunks.push(c));
      doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { business, customer, items = [] } = invoice;
      const W = 515; // usable width

      /* ── Colors & Fonts ── */
      const PRIMARY  = '#1e40af'; // dark blue
      const LIGHT_BG = '#eff6ff';
      const GRAY     = '#64748b';
      const BLACK    = '#0f172a';
      const LINE     = '#e2e8f0';

      /* ─────── HEADER ─────────────────────────────────────────────── */
      // Top bar
      doc.rect(40, 40, W, 70).fill(PRIMARY);

      // Business name
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
        .text(business?.name || 'Your Business', 55, 52, { width: 300 });

      // TAX INVOICE label
      doc.font('Helvetica').fontSize(9).fillColor('#bfdbfe')
        .text('TAX INVOICE', 55, 76);

      // Invoice no + date (right side)
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
        .text(invoice.invoice_no, 360, 52, { width: 180, align: 'right' });
      doc.font('Helvetica').fontSize(8).fillColor('#bfdbfe')
        .text(
          `Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`,
          360, 70, { width: 180, align: 'right' }
        );
      if (invoice.due_date) {
        doc.text(
          `Due: ${new Date(invoice.due_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`,
          360, 82, { width: 180, align: 'right' }
        );
      }

      /* ─────── FROM / TO ──────────────────────────────────────────── */
      let y = 125;

      // FROM — Business details
      doc.rect(40, y, 245, 100).fill(LIGHT_BG).stroke(LINE);
      doc.fillColor(GRAY).font('Helvetica').fontSize(7)
        .text('FROM', 50, y + 8);
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10)
        .text(business?.name || '', 50, y + 20, { width: 225 });
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
        .text(business?.address || '', 50, y + 34, { width: 225 })
        .text(`Phone: ${business?.phone || ''}`, 50, y + 46)
        .text(`Email: ${business?.email || ''}`, 50, y + 58);
      if (business?.gstin)
        doc.font('Helvetica-Bold').fillColor(PRIMARY).fontSize(8)
          .text(`GSTIN: ${business.gstin}`, 50, y + 72);

      // TO — Customer details
      doc.rect(295, y, 260, 100).fill(LIGHT_BG).stroke(LINE);
      doc.fillColor(GRAY).font('Helvetica').fontSize(7)
        .text('BILL TO', 305, y + 8);
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10)
        .text(customer?.name || '', 305, y + 20, { width: 240 });
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
        .text(customer?.address ? `${customer.address}, ${customer.city || ''}, ${customer.state || ''}` : '', 305, y + 34, { width: 240 })
        .text(`Phone: ${customer?.phone || ''}`, 305, y + 58)
        .text(`Email: ${customer?.email || ''}`, 305, y + 70);
      if (customer?.gstin)
        doc.font('Helvetica-Bold').fillColor(PRIMARY).fontSize(8)
          .text(`GSTIN: ${customer.gstin}`, 305, y + 84);

      /* ─────── ITEMS TABLE ────────────────────────────────────────── */
      y += 115;

      // Table header
      const cols = {
        no:       { x: 40,  w: 25  },
        name:     { x: 65,  w: 150 },
        hsn:      { x: 215, w: 55  },
        qty:      { x: 270, w: 35  },
        price:    { x: 305, w: 60  },
        disc:     { x: 365, w: 40  },
        gst:      { x: 405, w: 35  },
        tax:      { x: 440, w: 50  },
        total:    { x: 490, w: 65  },
      };

      doc.rect(40, y, W, 18).fill(PRIMARY);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5);
      const headerY = y + 5;
      doc.text('#',        cols.no.x,    headerY, { width: cols.no.w,    align: 'center' });
      doc.text('ITEM',     cols.name.x,  headerY, { width: cols.name.w  });
      doc.text('HSN',      cols.hsn.x,   headerY, { width: cols.hsn.w,  align: 'center' });
      doc.text('QTY',      cols.qty.x,   headerY, { width: cols.qty.w,  align: 'center' });
      doc.text('RATE',     cols.price.x, headerY, { width: cols.price.w, align: 'right'  });
      doc.text('DISC%',    cols.disc.x,  headerY, { width: cols.disc.w,  align: 'right'  });
      doc.text('GST%',     cols.gst.x,   headerY, { width: cols.gst.w,   align: 'center' });
      doc.text('TAX',      cols.tax.x,   headerY, { width: cols.tax.w,   align: 'right'  });
      doc.text('AMOUNT',   cols.total.x, headerY, { width: cols.total.w, align: 'right'  });

      y += 18;

      // Item rows
      items.forEach((item, i) => {
        const rowH  = 22;
        const bg    = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, y, W, rowH).fill(bg).stroke(LINE);

        const taxAmt = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
        const ry     = y + 6;

        doc.fillColor(BLACK).font('Helvetica').fontSize(8);
        doc.text(String(i + 1),           cols.no.x,    ry, { width: cols.no.w,    align: 'center' });
        doc.font('Helvetica-Bold')
          .text(item.name || '',           cols.name.x,  ry, { width: cols.name.w  });
        doc.font('Helvetica')
          .text(item.hsn_code || '–',     cols.hsn.x,   ry, { width: cols.hsn.w,   align: 'center' })
          .text(String(item.qty),          cols.qty.x,   ry, { width: cols.qty.w,   align: 'center' })
          .text(`₹${fmt(item.price)}`,    cols.price.x, ry, { width: cols.price.w,  align: 'right'  })
          .text(`${item.discount || 0}%`, cols.disc.x,  ry, { width: cols.disc.w,   align: 'right'  })
          .text(`${item.gst_rate || 0}%`, cols.gst.x,   ry, { width: cols.gst.w,    align: 'center' })
          .text(`₹${fmt(taxAmt)}`,        cols.tax.x,   ry, { width: cols.tax.w,    align: 'right'  })
          .text(`₹${fmt(item.total)}`,    cols.total.x, ry, { width: cols.total.w,  align: 'right'  });
        y += rowH;
      });

      /* ─────── GST BREAKUP + TOTALS ───────────────────────────────── */
      y += 8;

      // GST breakup box (left)
      const breakupX = 40;
      const breakupW = 260;
      doc.rect(breakupX, y, breakupW, 80).fill(LIGHT_BG).stroke(LINE);

      doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(7.5)
        .text('GST BREAKUP', breakupX + 8, y + 8);

      const isIGST = (invoice.igst || 0) > 0;
      doc.font('Helvetica').fontSize(8).fillColor(BLACK);
      let by = y + 20;

      if (!isIGST) {
        doc.text('CGST:', breakupX + 10, by,       { width: 100 });
        doc.text(`₹${fmt(invoice.cgst)}`, breakupX + 110, by, { width: 130, align: 'right' });
        by += 14;
        doc.text('SGST:', breakupX + 10, by,       { width: 100 });
        doc.text(`₹${fmt(invoice.sgst)}`, breakupX + 110, by, { width: 130, align: 'right' });
        by += 14;
      } else {
        doc.text('IGST:', breakupX + 10, by,       { width: 100 });
        doc.text(`₹${fmt(invoice.igst)}`, breakupX + 110, by, { width: 130, align: 'right' });
        by += 14;
      }
      const totalTax = (invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0);
      doc.font('Helvetica-Bold')
        .text('Total Tax:', breakupX + 10, by,     { width: 100 });
      doc.text(`₹${fmt(totalTax)}`, breakupX + 110, by, { width: 130, align: 'right' });

      // Totals box (right)
      const totX = 310;
      const totW = 245;
      doc.rect(totX, y, totW, 80).fill(LIGHT_BG).stroke(LINE);

      const totRows = [
        ['Subtotal',  `₹${fmt(invoice.subtotal)}`],
        ['Discount',  `-₹${fmt(invoice.discount || 0)}`],
        ['Tax',       `₹${fmt(totalTax)}`],
      ];

      let ty = y + 10;
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
      totRows.forEach(([label, val]) => {
        doc.text(label, totX + 10, ty,  { width: 120 });
        doc.text(val,   totX + 130, ty, { width: 105, align: 'right' });
        ty += 14;
      });

      // Grand total highlighted
      doc.rect(totX, y + 56, totW, 24).fill(PRIMARY);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
        .text('TOTAL',         totX + 10,  y + 61, { width: 120 })
        .text(`₹${fmt(invoice.total)}`, totX + 130, y + 61, { width: 105, align: 'right' });

      /* ─────── AMOUNT IN WORDS ────────────────────────────────────── */
      y += 98;
      doc.rect(40, y, W, 22).fill('#fefce8').stroke(LINE);
      doc.fillColor(GRAY).font('Helvetica').fontSize(7.5)
        .text('Amount in Words: ', 50, y + 7, { continued: true });
      doc.fillColor(BLACK).font('Helvetica-Bold')
        .text(amountInWords(invoice.total || 0));

      /* ─────── PAYMENT STATUS ─────────────────────────────────────── */
      y += 30;
      const statusColors = {
        PAID:      { bg: '#dcfce7', text: '#15803d' },
        SENT:      { bg: '#dbeafe', text: '#1d4ed8' },
        PENDING:   { bg: '#fef9c3', text: '#854d0e' },
        DRAFT:     { bg: '#f1f5f9', text: '#475569' },
        CANCELLED: { bg: '#fee2e2', text: '#b91c1c' },
      };
      const sc = statusColors[invoice.status] || statusColors.DRAFT;
      doc.rect(40, y, 100, 22).fill(sc.bg).stroke(sc.text);
      doc.fillColor(sc.text).font('Helvetica-Bold').fontSize(9)
        .text(invoice.status || 'DRAFT', 40, y + 6, { width: 100, align: 'center' });

      /* ─────── NOTES & FOOTER ─────────────────────────────────────── */
      if (invoice.notes) {
        y += 32;
        doc.fillColor(GRAY).font('Helvetica').fontSize(7.5)
          .text('Notes: ', 40, y, { continued: true });
        doc.fillColor(BLACK).text(invoice.notes);
      }

      // Footer bar
      doc.rect(40, 780, W, 20).fill(PRIMARY);
      doc.fillColor('#bfdbfe').font('Helvetica').fontSize(7)
        .text('This is a computer-generated invoice.', 40, 786, { width: W, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/** Number formatter helper */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

module.exports = { generateInvoicePDF };