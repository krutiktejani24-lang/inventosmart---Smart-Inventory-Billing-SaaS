/**
 * whatsappHelper.js — InventoSmart
 * WhatsApp share link + message generate karo
 */

/**
 * WhatsApp share message banavo — Indian business format
 * @param {object} invoice - invoice with customer + business
 * @returns {string} formatted WhatsApp message
 */
const buildWhatsAppMessage = (invoice) => {
  const business  = invoice.business  || {};
  const customer  = invoice.customer  || {};
  const dueDate   = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    : null;

  const lines = [
    `🧾 *Invoice from ${business.name || 'InventoSmart'}*`,
    ``,
    `Invoice No: *${invoice.invoice_no}*`,
    `Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`,
    dueDate ? `Due Date: ${dueDate}` : null,
    ``,
    `Dear *${customer.name}*,`,
    ``,
    `Please find your invoice details below:`,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
  ];

  // Line items
  if (invoice.items?.length) {
    invoice.items.forEach(item => {
      lines.push(`• ${item.name} × ${item.qty} = ₹${Number(item.total).toLocaleString('en-IN', { minimumFractionDigits:2 })}`);
    });
    lines.push(`━━━━━━━━━━━━━━━━━━`);
  }

  // Totals
  if (invoice.discount > 0)
    lines.push(`Discount: -₹${Number(invoice.discount).toLocaleString('en-IN', { minimumFractionDigits:2 })}`);
  if (invoice.cgst > 0)
    lines.push(`CGST: ₹${Number(invoice.cgst).toLocaleString('en-IN', { minimumFractionDigits:2 })}`);
  if (invoice.sgst > 0)
    lines.push(`SGST: ₹${Number(invoice.sgst).toLocaleString('en-IN', { minimumFractionDigits:2 })}`);
  if (invoice.igst > 0)
    lines.push(`IGST: ₹${Number(invoice.igst).toLocaleString('en-IN', { minimumFractionDigits:2 })}`);

  lines.push(`*Total: ₹${Number(invoice.total).toLocaleString('en-IN', { minimumFractionDigits:2 })}*`);
  lines.push(``);

  // Payment status
  const statusEmoji = {
    PAID: '✅ PAID', SENT: '⏳ Payment Pending',
    DRAFT: '📝 Draft', CANCELLED: '❌ Cancelled',
  };
  lines.push(`Status: ${statusEmoji[invoice.status] || invoice.status}`);

  // PDF link if available
  if (invoice.pdfLink) {
    lines.push(``);
    lines.push(`📎 Download Invoice: ${invoice.pdfLink}`);
  }

  lines.push(``);
  if (business.phone)
    lines.push(`📞 ${business.phone}`);
  if (business.gstin)
    lines.push(`GSTIN: ${business.gstin}`);

  lines.push(``);
  lines.push(`_Sent via InventoSmart_`);

  return lines.filter(l => l !== null).join('\n');
};

/**
 * wa.me share URL banavo
 * @param {string} phone  - customer phone (with or without country code)
 * @param {string} message - WhatsApp message text
 * @returns {string} wa.me URL
 */
const buildWhatsAppURL = (phone, message) => {
  // Phone number clean karo — only digits
  const cleaned = (phone || '').replace(/\D/g, '');

  // India (+91) prefix add karo if needed
  const normalized = cleaned.startsWith('91') && cleaned.length === 12
    ? cleaned
    : cleaned.length === 10
      ? `91${cleaned}`
      : cleaned;

  const encoded = encodeURIComponent(message);

  // Phone number hoy to direct chat, nahi to share dialog
  return normalized
    ? `https://wa.me/${normalized}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
};

module.exports = { buildWhatsAppMessage, buildWhatsAppURL };