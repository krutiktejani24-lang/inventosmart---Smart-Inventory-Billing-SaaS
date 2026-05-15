/**
 * gstEngine.js — InventoSmart
 * HSN code thi GST rate determine karo
 * Intra-state: CGST + SGST (50/50 split)
 * Inter-state: IGST (full rate)
 */

/* ─────────────────────────────────────────────────────────────────────
   HSN → GST Rate Lookup Table (common Indian goods)
───────────────────────────────────────────────────────────────────── */
const HSN_GST_RATES = {
  // 0% — Essential items
  '0101': 0, '0102': 0, '0201': 0, '0301': 0,
  '1001': 0, '1002': 0, '1003': 0, '1004': 0, '1005': 0,
  '1006': 0, '1101': 0, '1102': 0, '1701': 0,

  // 5% — Basic necessities
  '0801': 5, '0901': 5, '0902': 5, '1507': 5,
  '1511': 5, '1512': 5, '1513': 5, '1514': 5,
  '1904': 5, '2106': 5, '3006': 5, '3304': 5,

  // 12% — Standard goods
  '0402': 12, '1806': 12, '2009': 12, '2202': 12,
  '3004': 12, '3306': 12, '3307': 12, '4820': 12,
  '6109': 12, '6203': 12, '6204': 12,

  // 18% — Most goods/services
  '2201': 18, '2203': 18, '2204': 18,
  '3301': 18, '3302': 18, '3401': 18, '3402': 18,
  '3808': 18, '3926': 18, '4901': 18, '4902': 18,
  '7013': 18, '7323': 18, '8414': 18, '8415': 18,
  '8418': 18, '8443': 18, '8471': 18, '8517': 18,
  '8528': 18, '8544': 18, '9403': 18,

  // 28% — Luxury / sin goods
  '2402': 28, '2403': 28, '8703': 28,
  '8711': 28, '9301': 28, '9504': 28,
};

/**
 * HSN code thi GST rate milavo
 * First 4 digits match karo, pachhi 2 digits, pachhi default 18%
 * @param {string} hsnCode
 * @returns {number} GST rate (0 | 5 | 12 | 18 | 28)
 */
const getGSTRateByHSN = (hsnCode) => {
  if (!hsnCode) return 18; // default

  const code = String(hsnCode).replace(/\s/g, '');

  // Exact 4-digit match
  const four = code.slice(0, 4);
  if (HSN_GST_RATES[four] !== undefined) return HSN_GST_RATES[four];

  // 2-digit chapter match
  const two = code.slice(0, 2);
  const chapterRates = Object.entries(HSN_GST_RATES)
    .filter(([k]) => k.startsWith(two))
    .map(([, v]) => v);

  if (chapterRates.length) {
    // Most common rate in chapter
    const freq = {};
    chapterRates.forEach((r) => (freq[r] = (freq[r] || 0) + 1));
    return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
  }

  return 18; // fallback
};

/* ─────────────────────────────────────────────────────────────────────
   Calculate tax for a single line item
───────────────────────────────────────────────────────────────────── */
/**
 * @param {number} price       - unit price
 * @param {number} qty         - quantity
 * @param {number} discountPct - discount percentage (0–100)
 * @param {number} gstRate     - total GST % (0/5/12/18/28)
 * @param {boolean} isIGST     - true = inter-state (IGST), false = intra (CGST+SGST)
 */
const calculateItemTax = (price, qty, discountPct = 0, gstRate = 18, isIGST = false) => {
  const grossAmount  = price * qty;
  const discountAmt  = (grossAmount * discountPct) / 100;
  const taxableValue = grossAmount - discountAmt;

  const totalTax = (taxableValue * gstRate) / 100;
  const lineTotal = taxableValue + totalTax;

  if (isIGST) {
    return {
      taxable_value: round2(taxableValue),
      discount:      round2(discountAmt),
      cgst:          0,
      sgst:          0,
      igst:          round2(totalTax),
      total:         round2(lineTotal),
    };
  }

  const halfTax = totalTax / 2;
  return {
    taxable_value: round2(taxableValue),
    discount:      round2(discountAmt),
    cgst:          round2(halfTax),
    sgst:          round2(halfTax),
    igst:          0,
    total:         round2(lineTotal),
  };
};

/* ─────────────────────────────────────────────────────────────────────
   Calculate full invoice totals from items array
───────────────────────────────────────────────────────────────────── */
/**
 * @param {Array}   items   - [{ price, qty, discount, gst_rate, hsn_code }]
 * @param {boolean} isIGST  - inter-state invoice?
 * @param {number}  invoiceDiscount - extra invoice-level discount %
 * @returns {object} invoice totals + enriched items
 */
const calculateInvoiceTotals = (items, isIGST = false, invoiceDiscount = 0) => {
  let subtotal   = 0;
  let totalCGST  = 0;
  let totalSGST  = 0;
  let totalIGST  = 0;
  let totalDiscount = 0;

  const enrichedItems = items.map((item) => {
    // If gst_rate not provided, determine from HSN
    const gstRate = item.gst_rate !== undefined && item.gst_rate !== null
      ? Number(item.gst_rate)
      : getGSTRateByHSN(item.hsn_code);

    const tax = calculateItemTax(
      Number(item.price),
      Number(item.qty),
      Number(item.discount || 0),
      gstRate,
      isIGST
    );

    subtotal      += tax.taxable_value;
    totalDiscount += tax.discount;
    totalCGST     += tax.cgst;
    totalSGST     += tax.sgst;
    totalIGST     += tax.igst;

    return {
      ...item,
      gst_rate:  gstRate,
      discount:  Number(item.discount || 0),
      cgst:      tax.cgst,
      sgst:      tax.sgst,
      igst:      tax.igst,
      total:     tax.total,
    };
  });

  // Invoice-level discount (applied on subtotal)
  const invoiceDiscountAmt = (subtotal * invoiceDiscount) / 100;
  const finalSubtotal      = subtotal - invoiceDiscountAmt;
  const grandTotal         = round2(finalSubtotal + totalCGST + totalSGST + totalIGST);

  return {
    items:    enrichedItems,
    subtotal: round2(subtotal),
    discount: round2(totalDiscount + invoiceDiscountAmt),
    cgst:     round2(totalCGST),
    sgst:     round2(totalSGST),
    igst:     round2(totalIGST),
    total:    grandTotal,
  };
};

/* ─────────────────────────────────────────────────────────────────────
   Amount in words (Indian format)
───────────────────────────────────────────────────────────────────── */
const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
  'Seventeen','Eighteen','Nineteen'];
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

const numToWords = (n) => {
  if (n === 0) return 'Zero';
  if (n < 20)  return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
  if (n < 100000)  return numToWords(Math.floor(n / 1000))  + ' Thousand' + (n % 1000  ? ' ' + numToWords(n % 1000)  : '');
  if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh'    + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
  return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
};

const amountInWords = (amount) => {
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let result   = 'Rupees ' + numToWords(rupees);
  if (paise)   result += ' and ' + numToWords(paise) + ' Paise';
  return result + ' Only';
};

/* ─────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────── */
const round2 = (n) => Math.round(n * 100) / 100;

module.exports = {
  getGSTRateByHSN,
  calculateItemTax,
  calculateInvoiceTotals,
  amountInWords,
  round2,
};