const PDFDocument = require('pdfkit');
const { amountInWords } = require('../services/gstEngine');

let generateUPIQR;
try {
  generateUPIQR = require('./upiQRHelper').generateUPIQR;
} catch { generateUPIQR = null; }

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n||0);

/**
 * generateInvoicePDF — Indian GST Invoice with UPI QR
 */
const generateInvoicePDF = (invoice) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc    = new PDFDocument({ margin:40, size:'A4' });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { business={}, customer={}, items=[] } = invoice;
      const W       = 515;
      const PRIMARY = '#1e40af';
      const LIGHT   = '#eff6ff';
      const GRAY    = '#64748b';
      const BLACK   = '#0f172a';
      const LINE    = '#e2e8f0';

      /* ── HEADER ── */
      doc.rect(40,40,W,70).fill(PRIMARY);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(18)
        .text(business.name||'Your Business', 55, 52, { width:300 });
      doc.font('Helvetica').fontSize(9).fillColor('#bfdbfe').text('TAX INVOICE', 55, 76);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff')
        .text(invoice.invoice_no, 360, 52, { width:180, align:'right' });
      doc.font('Helvetica').fontSize(8).fillColor('#bfdbfe')
        .text(`Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}`, 360, 70, { width:180, align:'right' });
      if (invoice.due_date)
        doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}`, 360, 82, { width:180, align:'right' });

      /* ── FROM / TO ── */
      let y = 125;
      doc.rect(40,y,245,100).fill(LIGHT).stroke(LINE);
      doc.fillColor(GRAY).font('Helvetica').fontSize(7).text('FROM', 50, y+8);
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10).text(business.name||'', 50, y+20, {width:225});
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
        .text(business.address||'', 50, y+34, {width:225})
        .text(`Phone: ${business.phone||''}`, 50, y+46)
        .text(`Email: ${business.email||''}`, 50, y+58);
      if (business.gstin)
        doc.font('Helvetica-Bold').fillColor(PRIMARY).fontSize(8).text(`GSTIN: ${business.gstin}`, 50, y+72);

      doc.rect(295,y,260,100).fill(LIGHT).stroke(LINE);
      doc.fillColor(GRAY).font('Helvetica').fontSize(7).text('BILL TO', 305, y+8);
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10).text(customer.name||'', 305, y+20, {width:240});
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
        .text(customer.address ? `${customer.address}, ${customer.city||''}` : '', 305, y+34, {width:240})
        .text(`Phone: ${customer.phone||''}`, 305, y+58)
        .text(`Email: ${customer.email||''}`, 305, y+70);
      if (customer.gstin)
        doc.font('Helvetica-Bold').fillColor(PRIMARY).fontSize(8).text(`GSTIN: ${customer.gstin}`, 305, y+84);

      /* ── ITEMS TABLE ── */
      y += 115;
      const C = {
        no:{x:40,w:25}, name:{x:65,w:150}, hsn:{x:215,w:55}, qty:{x:270,w:35},
        price:{x:305,w:60}, disc:{x:365,w:40}, gst:{x:405,w:35}, tax:{x:440,w:50}, total:{x:490,w:65}
      };
      doc.rect(40,y,W,18).fill(PRIMARY);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(7.5);
      const hY = y+5;
      doc.text('#',C.no.x,hY,{width:C.no.w,align:'center'});
      doc.text('ITEM',C.name.x,hY,{width:C.name.w});
      doc.text('HSN',C.hsn.x,hY,{width:C.hsn.w,align:'center'});
      doc.text('QTY',C.qty.x,hY,{width:C.qty.w,align:'center'});
      doc.text('RATE',C.price.x,hY,{width:C.price.w,align:'right'});
      doc.text('DISC%',C.disc.x,hY,{width:C.disc.w,align:'right'});
      doc.text('GST%',C.gst.x,hY,{width:C.gst.w,align:'center'});
      doc.text('TAX',C.tax.x,hY,{width:C.tax.w,align:'right'});
      doc.text('AMOUNT',C.total.x,hY,{width:C.total.w,align:'right'});
      y += 18;

      items.forEach((item, i) => {
        const rH = 22;
        doc.rect(40,y,W,rH).fill(i%2===0?'#fff':'#f8fafc').stroke(LINE);
        const ry = y+6;
        const tax = (item.cgst||0)+(item.sgst||0)+(item.igst||0);
        doc.fillColor(BLACK).font('Helvetica').fontSize(8);
        doc.text(String(i+1),C.no.x,ry,{width:C.no.w,align:'center'});
        doc.font('Helvetica-Bold').text(item.name||'',C.name.x,ry,{width:C.name.w});
        doc.font('Helvetica')
          .text(item.hsn_code||'–',C.hsn.x,ry,{width:C.hsn.w,align:'center'})
          .text(String(item.qty),C.qty.x,ry,{width:C.qty.w,align:'center'})
          .text(`₹${fmt(item.price)}`,C.price.x,ry,{width:C.price.w,align:'right'})
          .text(`${item.discount||0}%`,C.disc.x,ry,{width:C.disc.w,align:'right'})
          .text(`${item.gst_rate||0}%`,C.gst.x,ry,{width:C.gst.w,align:'center'})
          .text(`₹${fmt(tax)}`,C.tax.x,ry,{width:C.tax.w,align:'right'})
          .text(`₹${fmt(item.total)}`,C.total.x,ry,{width:C.total.w,align:'right'});
        y += rH;
      });

      /* ── GST BREAKUP + TOTALS ── */
      y += 8;
      const isIGST  = (invoice.igst||0) > 0;
      const totalTax = (invoice.cgst||0)+(invoice.sgst||0)+(invoice.igst||0);

      doc.rect(40,y,260,80).fill(LIGHT).stroke(LINE);
      doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(7.5).text('GST BREAKUP',48,y+8);
      doc.font('Helvetica').fontSize(8).fillColor(BLACK);
      let by = y+20;
      if (!isIGST) {
        doc.text('CGST:',50,by,{width:100}); doc.text(`₹${fmt(invoice.cgst)}`,160,by,{width:130,align:'right'}); by+=14;
        doc.text('SGST:',50,by,{width:100}); doc.text(`₹${fmt(invoice.sgst)}`,160,by,{width:130,align:'right'}); by+=14;
      } else {
        doc.text('IGST:',50,by,{width:100}); doc.text(`₹${fmt(invoice.igst)}`,160,by,{width:130,align:'right'}); by+=14;
      }
      doc.font('Helvetica-Bold').text('Total Tax:',50,by,{width:100});
      doc.text(`₹${fmt(totalTax)}`,160,by,{width:130,align:'right'});

      doc.rect(310,y,245,80).fill(LIGHT).stroke(LINE);
      let ty = y+10;
      [['Subtotal',invoice.subtotal],['Discount',`-${fmt(invoice.discount||0)}`],['Tax',totalTax]].forEach(([l,v]) => {
        doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
          .text(l,320,ty,{width:120})
          .text(typeof v==='number'?`₹${fmt(v)}`:`₹${v}`,440,ty,{width:105,align:'right'});
        ty+=14;
      });
      doc.rect(310,y+56,245,24).fill(PRIMARY);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(11)
        .text('TOTAL',320,y+61,{width:120})
        .text(`₹${fmt(invoice.total)}`,440,y+61,{width:105,align:'right'});

      /* ── AMOUNT IN WORDS ── */
      y += 98;
      doc.rect(40,y,W,22).fill('#fefce8').stroke(LINE);
      doc.fillColor(GRAY).font('Helvetica').fontSize(7.5).text('Amount in Words: ',50,y+7,{continued:true});
      doc.fillColor(BLACK).font('Helvetica-Bold').text(amountInWords(invoice.total||0));

      /* ── UPI QR SECTION ── */
      y += 30;
      const upiId  = business.upi_id || invoice.upiId || null;
      const hasUPI = !!(upiId && upiId.trim() && generateUPIQR);

      if (hasUPI) {
        try {
          const qrBuf = await generateUPIQR({
            upiId,
            payeeName: business.name || 'Merchant',
            amount:    invoice.total || 0,
            invoiceNo: invoice.invoice_no,
          }, { width:120 });

          doc.rect(40,y,W,110).fill('#f0fdf4').stroke('#86efac');
          doc.image(qrBuf, 52, y+10, { width:90, height:90 });

          doc.fillColor('#15803d').font('Helvetica-Bold').fontSize(12)
            .text('Pay via UPI', 158, y+12);
          doc.fillColor('#166534').font('Helvetica').fontSize(9)
            .text('Scan QR with any UPI app', 158, y+30);

          doc.fillColor(GRAY).fontSize(8.5).text('UPI ID: ', 158, y+48, {continued:true});
          doc.fillColor(BLACK).font('Helvetica-Bold').text(upiId);

          doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Amount: ', 158, y+64, {continued:true});
          doc.fillColor('#15803d').font('Helvetica-Bold').fontSize(11).text(`₹${fmt(invoice.total)}`);

          doc.fillColor('#6b7280').font('Helvetica').fontSize(7.5)
            .text('PhonePe  •  Google Pay  •  Paytm  •  BHIM  •  Any UPI App', 158, y+82);
          doc.fillColor('#9ca3af').fontSize(7)
            .text(`Invoice: ${invoice.invoice_no}`, 158, y+96);

          y += 118;
        } catch (e) {
          console.warn('[PDF] QR skip:', e.message);
          y += 10;
        }
      } else {
        // UPI not configured — show hint
        doc.rect(40,y,W,36).fill('#f8fafc').stroke(LINE);
        doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
          .text('Add your UPI ID in Settings → Business Profile to show UPI payment QR on invoices', 50, y+12, {width:W-20, align:'center'});
        y += 44;
      }

      /* ── NOTES + STATUS ── */
      if (invoice.notes) {
        doc.fillColor(GRAY).font('Helvetica').fontSize(7.5).text('Notes: ',40,y,{continued:true});
        doc.fillColor(BLACK).text(invoice.notes);
        y += 18;
      }

      const stBg   = {PAID:'#dcfce7',SENT:'#dbeafe',DRAFT:'#f1f5f9',CANCELLED:'#fee2e2'};
      const stText = {PAID:'#15803d',SENT:'#1d4ed8',DRAFT:'#475569',CANCELLED:'#b91c1c'};
      doc.rect(40,y,100,22).fill(stBg[invoice.status]||'#f1f5f9').stroke(stText[invoice.status]||'#475569');
      doc.fillColor(stText[invoice.status]||'#475569').font('Helvetica-Bold').fontSize(9)
        .text(invoice.status||'DRAFT',40,y+6,{width:100,align:'center'});

      /* ── FOOTER ── */
      doc.rect(40,780,W,20).fill(PRIMARY);
      doc.fillColor('#bfdbfe').font('Helvetica').fontSize(7)
        .text('Computer-generated invoice — InventoSmart',40,786,{width:W,align:'center'});

      doc.end();
    } catch (err) { reject(err); }
  });
};

module.exports = { generateInvoicePDF };